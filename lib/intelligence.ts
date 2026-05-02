import type { ConfigPayload, GovernedResponse, PolicyDocument, ResponseMode, RoleConfig, Trace } from "./types";

const responseKeys = [
  "answer",
  "supportingRationale",
  "sourceReferences",
  "risksOrLimitations",
  "recommendedNextSteps",
  "confidence",
  "escalationRequired"
];

export function getModel() {
  return process.env.OPENAI_MODEL || "gpt-5.2";
}

export function findRole(config: ConfigPayload, roleId: string) {
  return config.roles.find((role) => role.id === roleId) ?? config.roles[0];
}

export function selectPolicies(config: ConfigPayload, query: string) {
  const normalized = query.toLowerCase();
  const signals = ["remote", "state", "work", "tax", "payroll", "security", "patient", "location"];
  const hasSignal = signals.some((signal) => normalized.includes(signal));
  if (hasSignal) return config.policies;
  return config.policies.slice(0, 2);
}

export function buildTrace(config: ConfigPayload, role: RoleConfig, policies: PolicyDocument[]): Trace {
  return {
    tenant: {
      tenantName: config.tenant.tenantName,
      industry: config.tenant.industry,
      tone: config.tenant.tone,
      configVersion: config.tenant.configVersion
    },
    role: {
      name: role.name,
      permissions: role.permissions,
      responseGuidance: role.responseGuidance
    },
    policies: policies.map((policy) => ({
      title: policy.title,
      sourceLabel: policy.sourceLabel,
      effectiveDate: policy.effectiveDate
    })),
    constraints: config.tenant.constraints,
    restrictedTopics: config.tenant.restrictedTopics,
    model: getModel(),
    outputSchema: responseKeys
  };
}

export function summarizePrompt(config: ConfigPayload, role: RoleConfig, policies: PolicyDocument[]) {
  return [
    `Tenant ${config.tenant.tenantName} v${config.tenant.configVersion}`,
    `Role ${role.name}`,
    `Agent ${config.agent.name}`,
    `Policies ${policies.map((policy) => policy.sourceLabel).join(", ")}`
  ].join(" | ");
}

export async function generateComparison(config: ConfigPayload, role: RoleConfig, query: string, requestedMode: "demo" | "live" | "auto") {
  const policies = selectPolicies(config, query);
  const trace = buildTrace(config, role, policies);
  const model = getModel();

  if (requestedMode === "demo") {
    return buildDemoComparison(config, role, policies, query, trace, "Demo");
  }

  try {
    const genericPromise = callGenericModel(query, model);
    const governedPromise = callGovernedModel(config, role, policies, query, model);
    const [generic, governed] = await Promise.all([genericPromise, governedPromise]);

    return {
      genericResponse: generic,
      governedResponse: governed.response,
      trace,
      policyRefs: policies.map((policy) => policy.sourceLabel),
      rawStatus: governed.status,
      assembledPromptSummary: summarizePrompt(config, role, policies),
      responseMode: "Live AI" as ResponseMode,
      liveError: null
    };
  } catch (error) {
    if (requestedMode === "live") throw error;
    const fallback = buildDemoComparison(config, role, policies, query, trace, "Demo fallback");
    return {
      ...fallback,
      liveError: error instanceof Error ? error.message : "Live AI request failed."
    };
  }
}

function buildDemoComparison(
  config: ConfigPayload,
  role: RoleConfig,
  policies: PolicyDocument[],
  query: string,
  trace: Trace,
  mode: ResponseMode
) {
  return {
    genericResponse: buildDemoGenericResponse(query),
    governedResponse: buildDemoGovernedResponse(config, role, policies),
    trace,
    policyRefs: policies.map((policy) => policy.sourceLabel),
    rawStatus: mode === "Demo fallback" ? "demo_fallback" : "demo",
    assembledPromptSummary: summarizePrompt(config, role, policies),
    responseMode: mode,
    liveError: null
  };
}

function buildDemoGenericResponse(query: string) {
  if (query.toLowerCase().includes("remote")) {
    return "It may be possible to work remotely from another state for three months, but you should check with your manager and HR. Requirements can vary based on company policy, taxes, payroll, and job responsibilities.";
  }
  return "This depends on your company policy and your specific situation. Check with the relevant internal team before acting.";
}

function buildDemoGovernedResponse(config: ConfigPayload, role: RoleConfig, policies: PolicyDocument[]): GovernedResponse {
  const refs = policies.map((policy) => `${policy.sourceLabel}: ${policy.title}`);
  const roleSpecific = {
    Employee:
      "You should not assume approval for a three-month out-of-state remote arrangement. Northstar allows routine remote flexibility from an approved home state, but out-of-state remote work beyond 30 calendar days requires HR review before approval.",
    Manager:
      "You can consider the request, but you should not approve it directly. A three-month out-of-state arrangement crosses Northstar's 30-day threshold and needs HR review, plus confirmation that team coverage and role duties remain workable.",
    "HR Admin":
      "This request requires HR intake and cross-functional review before approval. The employee should provide location, dates, duties, manager acknowledgement, and whether regulated data or patient information will be accessed.",
    Compliance:
      "This request presents payroll, state employment, workers compensation, and data security review requirements. It should remain pending until HR, payroll, and security controls are documented."
  }[role.name];

  return {
    answer: roleSpecific,
    supportingRationale: `${config.tenant.tenantName}'s Remote Work Policy permits routine flexibility from an approved home state, while temporary out-of-state work beyond 30 calendar days requires HR review. The request is for three months, so the Intelligence Layer applies the mobility checklist and data security constraints before answering.`,
    sourceReferences: refs,
    risksOrLimitations: [
      "Payroll registration, state tax withholding, workers compensation, and benefits eligibility may be affected.",
      "Access to patient information or sensitive systems from an unapproved location may require Security review.",
      "This MVP uses fictional Northstar policy data for demonstration and is not legal, tax, or HR advice."
    ],
    recommendedNextSteps: [
      "Submit the temporary out-of-state remote work request to HR before making travel plans.",
      "Include destination state, exact dates, job duties, manager acknowledgement, and data access needs.",
      "Wait for HR, payroll, and security review before treating the arrangement as approved."
    ],
    confidence: "High",
    escalationRequired: true
  };
}

async function callGenericModel(query: string, model: string) {
  const response = await createResponse({
    model,
    input: [
      {
        role: "system",
        content: "Answer the user briefly as a general-purpose assistant. Do not assume access to company policy."
      },
      {
        role: "user",
        content: query
      }
    ]
  });
  return extractOutputText(response) || "No generic response was returned.";
}

async function callGovernedModel(
  config: ConfigPayload,
  role: RoleConfig,
  policies: PolicyDocument[],
  query: string,
  model: string
) {
  const policyContext = policies
    .map(
      (policy) =>
        `Title: ${policy.title}\nSource: ${policy.sourceLabel}\nEffective: ${policy.effectiveDate}\nContent: ${policy.content}`
    )
    .join("\n\n");

  const response = await createResponse({
    model,
    input: [
      {
        role: "system",
        content: [
          `You are ${config.agent.name} for ${config.tenant.tenantName}, a ${config.tenant.industry}.`,
          `Tone: ${config.tenant.tone}.`,
          `Tenant constraints: ${config.tenant.constraints.join(" ")}`,
          `Restricted topics: ${config.tenant.restrictedTopics.join(", ")}.`,
          `Role: ${role.name}. Permissions: ${role.permissions.join(", ")}.`,
          `Role guidance: ${role.responseGuidance}`,
          `Approved data sources: ${config.agent.approvedDataSources.join(", ")}.`,
          "Use only the policy context below. If policy support is insufficient, say so and require escalation.",
          "Return a concise, auditable response in the required schema."
        ].join("\n")
      },
      {
        role: "user",
        content: `Policy context:\n${policyContext}\n\nUser question:\n${query}`
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "governed_hr_answer",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: responseKeys,
          properties: {
            answer: { type: "string" },
            supportingRationale: { type: "string" },
            sourceReferences: { type: "array", items: { type: "string" } },
            risksOrLimitations: { type: "array", items: { type: "string" } },
            recommendedNextSteps: { type: "array", items: { type: "string" } },
            confidence: { type: "string", enum: ["Low", "Medium", "High"] },
            escalationRequired: { type: "boolean" }
          }
        }
      }
    }
  });

  const parsed = JSON.parse(extractOutputText(response) || "{}") as GovernedResponse;
  return {
    response: parsed,
    status: typeof response.status === "string" ? response.status : "completed"
  };
}

async function createResponse(payload: Record<string, unknown>) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(payload)
  });
  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const error = data.error && typeof data.error === "object" && "message" in data.error ? String(data.error.message) : response.statusText;
    throw new Error(error);
  }
  return data;
}

function extractOutputText(response: Record<string, unknown>) {
  if (typeof response.output_text === "string") return response.output_text;
  const output = response.output;
  if (!Array.isArray(output)) return "";
  return output
    .flatMap((item: unknown) => {
      if (!item || typeof item !== "object" || !("content" in item)) return [];
      const contentList = (item as { content?: unknown }).content;
      if (!Array.isArray(contentList)) return [];
      return contentList.map((content: unknown) => {
        if (!content || typeof content !== "object" || !("text" in content)) return "";
        const text = (content as { text?: unknown }).text;
        if (typeof text === "string") return text;
        return "";
      });
    })
    .join("");
}

export function buildErrorResponse(error: unknown): GovernedResponse {
  const message = error instanceof Error ? error.message : "The model request failed.";
  return {
    answer: "The governed assistant could not complete this request because the AI service is not fully configured or returned an error.",
    supportingRationale: message,
    sourceReferences: [],
    risksOrLimitations: [
      "No policy-backed answer was generated.",
      "This interaction should be retried after configuration is corrected."
    ],
    recommendedNextSteps: [
      "Confirm OPENAI_API_KEY is configured in the deployment.",
      "Confirm OPENAI_MODEL points to a model that supports Structured Outputs.",
      "Retry the request and review the audit log."
    ],
    confidence: "Low",
    escalationRequired: true
  };
}
