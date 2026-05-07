const baseUrl = process.env.QA_BASE_URL || "http://127.0.0.1:3000";

const scenarios = [
  {
    title: "Employee mobility",
    roleId: "employee",
    query: "Can I work remotely from another state for 3 months?",
    genericMustInclude: ["remotely", "another state"],
    governedMustInclude: ["30 calendar days", "HR review"]
  },
  {
    title: "Manager approval",
    roleId: "manager",
    query: "My employee wants to work from California for 45 days. Can I approve it?",
    genericMustInclude: ["approve", "HR"],
    governedMustInclude: ["not approve it directly", "30-day threshold"]
  },
  {
    title: "Data security",
    roleId: "compliance",
    query: "What are the risks if I access patient data while working remotely from another state?",
    genericMustInclude: ["patient data", "security"],
    governedMustInclude: ["high-risk", "Security review"]
  },
  {
    title: "HR process",
    roleId: "hr-admin",
    query: "What documentation should HR collect before approving temporary out-of-state remote work?",
    genericMustInclude: ["collect", "dates"],
    governedMustInclude: ["destination state", "manager acknowledgement"]
  },
  {
    title: "Insufficient context",
    roleId: "employee",
    query: "Can I move wherever I want and keep my current job?",
    genericMustInclude: ["not assume", "approval"],
    governedMustInclude: ["No.", "specific state", "HR"]
  }
];

function assertIncludes(label, value, phrases) {
  const missing = phrases.filter((phrase) => !value.toLowerCase().includes(phrase.toLowerCase()));
  if (missing.length) {
    throw new Error(`${label} missing expected phrase(s): ${missing.join(", ")}`);
  }
}

async function runScenario(scenario) {
  const response = await fetch(`${baseUrl}/api/ask`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: scenario.query,
      roleId: scenario.roleId,
      compareMode: true,
      mode: "demo"
    })
  });

  if (!response.ok) {
    throw new Error(`${scenario.title} returned HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (!payload.auditId) throw new Error(`${scenario.title} did not create an audit event`);
  if (payload.responseMode !== "Demo") throw new Error(`${scenario.title} did not run in Demo mode`);
  if (!payload.trace?.policies?.length) throw new Error(`${scenario.title} did not include trace policies`);

  assertIncludes(`${scenario.title} generic response`, payload.genericResponse || "", scenario.genericMustInclude);
  assertIncludes(`${scenario.title} governed response`, payload.governedResponse?.answer || "", scenario.governedMustInclude);

  return {
    title: scenario.title,
    role: scenario.roleId,
    auditId: payload.auditId
  };
}

const results = [];
for (const scenario of scenarios) {
  results.push(await runScenario(scenario));
}

const routingChecks = [
  {
    query: "what is 9+10?",
    expectedAgent: "Generic Assistant",
    expectedPolicies: 0,
    expectedAnswer: "19"
  },
  {
    query: "Can I work remotely from another state for 3 months?",
    expectedAgent: "HR Policy Assistant",
    expectedPolicies: 1,
    expectedAnswer: "HR review"
  }
];

for (const check of routingChecks) {
  const response = await fetch(`${baseUrl}/api/ask`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: check.query,
      roleId: "employee",
      agentId: "automatic",
      compareMode: true,
      mode: "demo"
    })
  });
  if (!response.ok) throw new Error(`Automatic routing check returned HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.trace?.agent?.name !== check.expectedAgent) {
    throw new Error(`Automatic routing expected ${check.expectedAgent} but got ${payload.trace?.agent?.name}`);
  }
  if ((payload.trace?.policies?.length ?? 0) < check.expectedPolicies) {
    throw new Error(`Automatic routing expected at least ${check.expectedPolicies} policies for ${check.query}`);
  }
  assertIncludes(`Automatic routing response for ${check.query}`, payload.governedResponse?.answer || "", [check.expectedAnswer]);
}

const auditResponse = await fetch(`${baseUrl}/api/audit`);
if (!auditResponse.ok) throw new Error(`Audit endpoint returned HTTP ${auditResponse.status}`);
const auditPayload = await auditResponse.json();
if (!Array.isArray(auditPayload.events) || auditPayload.events.length < scenarios.length) {
  throw new Error("Audit endpoint did not return the expected scenario events");
}

console.log("Scenario QA passed:");
for (const result of results) {
  console.log(`- ${result.title} (${result.role}) audit=${result.auditId}`);
}
console.log("Automatic routing QA passed.");
