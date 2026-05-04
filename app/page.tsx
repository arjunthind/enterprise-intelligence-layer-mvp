"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { AuditEvent, ConfigPayload, GovernedResponse, ResponseMode, Trace } from "@/lib/types";

const defaultQuery = "Can I work remotely from another state for 3 months?";

const scenarios = [
  {
    title: "Employee mobility",
    roleId: "employee",
    query: "Can I work remotely from another state for 3 months?"
  },
  {
    title: "Manager approval",
    roleId: "manager",
    query: "My employee wants to work from California for 45 days. Can I approve it?"
  },
  {
    title: "Data security",
    roleId: "compliance",
    query: "What are the risks if I access patient data while working remotely from another state?"
  },
  {
    title: "HR process",
    roleId: "hr-admin",
    query: "What documentation should HR collect before approving temporary out-of-state remote work?"
  },
  {
    title: "Insufficient context",
    roleId: "employee",
    query: "Can I move wherever I want and keep my current job?"
  }
];

const scorecardRows = [
  ["Uses company policy", "No", "Yes"],
  ["Role-aware guidance", "No", "Yes"],
  ["Source-backed answer", "No", "Yes"],
  ["Risk escalation", "Unclear", "Required"],
  ["Structured output", "No", "Yes"]
];

type AskResult = {
  genericResponse: string;
  governedResponse: GovernedResponse;
  trace: Trace | null;
  auditId: string;
  responseMode?: ResponseMode;
  liveError?: string | null;
  error?: string;
};

export default function Home() {
  const [config, setConfig] = useState<ConfigPayload | null>(null);
  const [draftConfig, setDraftConfig] = useState<ConfigPayload | null>(null);
  const [selectedRole, setSelectedRole] = useState("employee");
  const [query, setQuery] = useState(defaultQuery);
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [activeView, setActiveView] = useState<"demo" | "admin" | "audit">("demo");
  const [result, setResult] = useState<AskResult | null>(null);
  const [audits, setAudits] = useState<AuditEvent[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<AuditEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [scenarioOpen, setScenarioOpen] = useState(false);

  const role = useMemo(() => config?.roles.find((item) => item.id === selectedRole), [config, selectedRole]);

  async function loadConfig() {
    const response = await fetch("/api/config");
    const payload = (await response.json()) as ConfigPayload;
    setConfig(payload);
    setDraftConfig(structuredClone(payload));
  }

  const loadAudits = useCallback(async () => {
    const response = await fetch("/api/audit");
    if (!response.ok) return;
    const payload = (await response.json()) as { events: AuditEvent[] };
    setAudits(payload.events);
  }, []);

  useEffect(() => {
    void loadConfig();
    void loadAudits();
  }, [loadAudits]);

  async function ask(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setStatus("Assembling tenant rules, role guidance, policy context, and schema...");
    setResult(null);

    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, roleId: selectedRole, compareMode: true, mode })
    });
    const payload = (await response.json()) as AskResult;
    setResult(payload);
    setStatus(
      response.ok
            ? `${payload.responseMode || "Governed"} response generated and audit event captured.`
        : "Live AI request failed; auditable fallback captured."
    );
    setLoading(false);
    await loadAudits();
  }

  async function saveConfig() {
    if (!draftConfig) return;
    setSaving(true);
    const response = await fetch("/api/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draftConfig)
    });
    if (!response.ok) {
      setStatus("Config save failed. Review the entered rulebook values and try again.");
      setSaving(false);
      return;
    }
    const payload = (await response.json()) as ConfigPayload;
    setConfig(payload);
    setDraftConfig(structuredClone(payload));
    setStatus(`Configuration saved as version ${payload.tenant.configVersion}.`);
    setSaving(false);
  }

  async function openAudit(id: string) {
    const response = await fetch(`/api/audit/${id}`);
    if (!response.ok) return;
    const payload = (await response.json()) as AuditEvent;
    setSelectedAudit(payload);
  }

  if (!config || !draftConfig) {
    return <main className="loading">Loading Intelligence Layer...</main>;
  }

  return (
    <main>
      <aside className="sidebar">
        <div>
          <p className="eyebrow">MVP Prototype</p>
          <h1>Enterprise Intelligence Layer</h1>
          <p className="sidebar-copy">Runtime context, rules, and structured outputs for reliable enterprise AI.</p>
        </div>
        <nav>
          <button className={activeView === "demo" ? "active" : ""} onClick={() => setActiveView("demo")}>
            Demo
          </button>
          <button className={activeView === "admin" ? "active" : ""} onClick={() => setActiveView("admin")}>
            Admin
          </button>
          <button className={activeView === "audit" ? "active" : ""} onClick={() => setActiveView("audit")}>
            Audit
          </button>
        </nav>
        <div className="tenant-card">
          <span>Tenant</span>
          <strong>{config.tenant.tenantName}</strong>
          <small>Config v{config.tenant.configVersion}</small>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{activeView === "demo" ? "Selected Agent: HR Policy Assistant" : activeView === "admin" ? "Control Plane" : "Governance Log"}</p>
            <h2>{activeView === "demo" ? "Turn Generic AI Into Governed Enterprise Guidance" : activeView === "admin" ? "Tenant Rulebook and Agent Controls" : "Auditable AI Interactions"}</h2>
            {activeView === "demo" ? (
              <p className="topbar-copy">
                This MVP uses HR as the first proof-of-value agent to demonstrate tenant context, role awareness, policy retrieval, and structured governance.
              </p>
            ) : null}
          </div>
          <div className="model-pill">Model: {result?.trace?.model || "gpt-5.2"}</div>
        </header>

        {status ? <div className="status">{status}</div> : null}

        {activeView === "demo" ? (
          <DemoView
            config={config}
            roleId={selectedRole}
            roleName={role?.name || "Employee"}
            query={query}
            mode={mode}
            result={result}
            loading={loading}
            setRoleId={setSelectedRole}
            setQuery={setQuery}
            setMode={setMode}
            scenarioOpen={scenarioOpen}
            setScenarioOpen={setScenarioOpen}
            ask={ask}
          />
        ) : null}

        {activeView === "admin" ? (
          <AdminView
            draftConfig={draftConfig}
            setDraftConfig={setDraftConfig}
            saveConfig={saveConfig}
            saving={saving}
          />
        ) : null}

        {activeView === "audit" ? (
          <AuditView audits={audits} selectedAudit={selectedAudit} openAudit={openAudit} />
        ) : null}
      </section>
    </main>
  );
}

function DemoView({
  config,
  roleId,
  roleName,
  query,
  mode,
  result,
  loading,
  setRoleId,
  setQuery,
  setMode,
  scenarioOpen,
  setScenarioOpen,
  ask
}: {
  config: ConfigPayload;
  roleId: string;
  roleName: string;
  query: string;
  mode: "demo" | "live";
  result: AskResult | null;
  loading: boolean;
  setRoleId: (roleId: string) => void;
  setQuery: (query: string) => void;
  setMode: (mode: "demo" | "live") => void;
  scenarioOpen: boolean;
  setScenarioOpen: (open: boolean) => void;
  ask: (event: FormEvent) => Promise<void>;
}) {
  return (
    <div className="stack">
      <form className="query-panel" onSubmit={ask}>
        <div className="demo-actions">
          <button type="button" className="secondary" onClick={() => setScenarioOpen(true)}>
            Open Scenario Library
          </button>
          <span>Optional walkthrough prompts for reviewer demos</span>
        </div>
        <div className="field-row">
          <label>
            Organization
            <select value={config.tenant.id} disabled>
              <option>{config.tenant.tenantName}</option>
            </select>
          </label>
          <label>
            User role
            <select value={roleId} onChange={(event) => setRoleId(event.target.value)}>
              {config.roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mode-control">
          <div className="mode-row" aria-label="Response mode">
            <button type="button" className={mode === "demo" ? "selected" : ""} onClick={() => setMode("demo")}>
              Demo mode
            </button>
            <button type="button" className={mode === "live" ? "selected" : ""} onClick={() => setMode("live")}>
              Live AI
            </button>
          </div>
          <div className="info-bubble" tabIndex={0} aria-label="Mode information">
            i
            <div className="info-popover" role="tooltip">
              <strong>Demo mode</strong> uses deterministic policy-backed responses for reliable stakeholder review.
              <strong>Live AI</strong> calls OpenAI when API access and billing are configured.
            </div>
          </div>
        </div>
        <label>
          User request
          <textarea value={query} onChange={(event) => setQuery(event.target.value)} rows={4} />
        </label>
        <button className="primary" disabled={loading}>
          {loading ? "Generating..." : "Run Intelligence Layer"}
        </button>
      </form>

      {scenarioOpen ? (
        <div className="scenario-overlay" role="dialog" aria-modal="true" aria-label="Scenario library">
          <div className="scenario-modal">
            <div className="modal-heading">
              <div>
                <p className="eyebrow">Scenario Library</p>
                <h3>Pick a boardroom-ready test case</h3>
              </div>
              <button type="button" className="icon-button" onClick={() => setScenarioOpen(false)} aria-label="Close scenario library">
                x
              </button>
            </div>
            <div className="scenario-grid">
              {scenarios.map((scenario) => (
                <button
                  key={scenario.title}
                  type="button"
                  className={query === scenario.query && roleId === scenario.roleId ? "selected" : ""}
                  onClick={() => {
                    setRoleId(scenario.roleId);
                    setQuery(scenario.query);
                    setScenarioOpen(false);
                  }}
                >
                  <strong>{scenario.title}</strong>
                  <span>{scenario.query}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="comparison">
        <section className="panel">
          <div className="panel-heading">
            <p className="eyebrow">Baseline</p>
            <h3>Generic AI</h3>
          </div>
          <p className="answer">{result?.genericResponse || "Run the default question to see the unguided model response."}</p>
        </section>
        <section className="panel governed">
          <div className="panel-heading">
            <p className="eyebrow">Governed for {roleName}</p>
            <h3>Governed AI</h3>
          </div>
          {result?.responseMode ? <div className="mode-badge">Mode: {result.responseMode}</div> : null}
          {result?.liveError ? <p className="inline-warning">Live AI was unavailable, so the MVP used deterministic demo output. Reason: {result.liveError}</p> : null}
          {result ? <StructuredAnswer response={result.governedResponse} /> : <p className="answer">The governed answer will render as a structured, policy-backed response.</p>}
        </section>
      </div>

      {result ? <EvaluationScorecard /> : null}

      <section className="trace">
        <div className="panel-heading">
          <p className="eyebrow">Runtime Decision Layer</p>
          <h3>Intelligence Layer Trace</h3>
        </div>
        {result?.trace ? (
          <div className="trace-grid">
            <TraceItem label="Tenant" value={`${result.trace.tenant.tenantName} / v${result.trace.tenant.configVersion}`} />
            <TraceItem label="Role context" value={`${result.trace.role.name}: ${result.trace.role.permissions.join(", ")}`} />
            <TraceItem label="Policies" value={result.trace.policies.map((policy) => `${policy.sourceLabel} ${policy.title}`).join(" | ")} />
            <TraceItem label="Constraints" value={result.trace.constraints.join(" ")} />
            <TraceItem label="Restricted topics" value={result.trace.restrictedTopics.join(", ")} />
            <TraceItem label="Output schema" value={result.trace.outputSchema.join(", ")} />
          </div>
        ) : (
          <p className="muted">The trace appears after a request and shows the context resolved before the AI call.</p>
        )}
      </section>
    </div>
  );
}

function EvaluationScorecard() {
  return (
    <section className="scorecard">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Proof of Value</p>
          <h3>Response Quality Scorecard</h3>
        </div>
      </div>
      <div className="scorecard-grid">
        <div className="scorecard-head">Dimension</div>
        <div className="scorecard-head">Generic AI</div>
        <div className="scorecard-head governed-head">Governed AI</div>
        {scorecardRows.map(([dimension, generic, governed]) => (
          <FragmentRow key={dimension} dimension={dimension} generic={generic} governed={governed} />
        ))}
      </div>
    </section>
  );
}

function FragmentRow({ dimension, generic, governed }: { dimension: string; generic: string; governed: string }) {
  return (
    <>
      <div>{dimension}</div>
      <div>
        <span className="score-pill muted-pill">{generic}</span>
      </div>
      <div>
        <span className="score-pill good-pill">{governed}</span>
      </div>
    </>
  );
}

function StructuredAnswer({ response }: { response: GovernedResponse }) {
  return (
    <div className="structured">
      <p className="answer">{response.answer}</p>
      <dl>
        <dt>Supporting rationale</dt>
        <dd>{response.supportingRationale}</dd>
        <dt>Source references</dt>
        <dd>{response.sourceReferences.join(", ") || "None"}</dd>
        <dt>Risks or limitations</dt>
        <dd>{response.risksOrLimitations.join(" ")}</dd>
        <dt>Recommended next steps</dt>
        <dd>{response.recommendedNextSteps.join(" ")}</dd>
        <dt>Confidence</dt>
        <dd>{response.confidence}</dd>
        <dt>Escalation required</dt>
        <dd>{response.escalationRequired ? "Yes" : "No"}</dd>
      </dl>
    </div>
  );
}

function TraceItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <p>{value}</p>
    </div>
  );
}

function AdminView({
  draftConfig,
  setDraftConfig,
  saveConfig,
  saving
}: {
  draftConfig: ConfigPayload;
  setDraftConfig: (config: ConfigPayload) => void;
  saveConfig: () => Promise<void>;
  saving: boolean;
}) {
  function updateTenantField(field: "industry" | "tone", value: string) {
    setDraftConfig({ ...draftConfig, tenant: { ...draftConfig.tenant, [field]: value } });
  }

  function updateList(field: "constraints" | "restrictedTopics", value: string) {
    setDraftConfig({
      ...draftConfig,
      tenant: {
        ...draftConfig.tenant,
        [field]: value.split("\n").map((item) => item.trim()).filter(Boolean)
      }
    });
  }

  return (
    <div className="admin-grid">
      <section className="panel">
        <h3>Tenant Rulebook</h3>
        <label>
          Industry context
          <input value={draftConfig.tenant.industry} onChange={(event) => updateTenantField("industry", event.target.value)} />
        </label>
        <label>
          Tone
          <input value={draftConfig.tenant.tone} onChange={(event) => updateTenantField("tone", event.target.value)} />
        </label>
        <label>
          Compliance constraints
          <textarea value={draftConfig.tenant.constraints.join("\n")} onChange={(event) => updateList("constraints", event.target.value)} rows={7} />
        </label>
        <label>
          Restricted topics
          <textarea value={draftConfig.tenant.restrictedTopics.join("\n")} onChange={(event) => updateList("restrictedTopics", event.target.value)} rows={4} />
        </label>
      </section>

      <section className="panel">
        <h3>Role Guidance</h3>
        {draftConfig.roles.map((role, index) => (
          <label key={role.id}>
            {role.name}
            <textarea
              value={role.responseGuidance}
              onChange={(event) => {
                const roles = [...draftConfig.roles];
                roles[index] = { ...role, responseGuidance: event.target.value };
                setDraftConfig({ ...draftConfig, roles });
              }}
              rows={3}
            />
          </label>
        ))}
      </section>

      <section className="panel">
        <h3>Approved Policy Snippets</h3>
        {draftConfig.policies.map((policy, index) => (
          <label key={policy.id}>
            {policy.sourceLabel} · {policy.title}
            <textarea
              value={policy.content}
              onChange={(event) => {
                const policies = [...draftConfig.policies];
                policies[index] = { ...policy, content: event.target.value };
                setDraftConfig({ ...draftConfig, policies });
              }}
              rows={4}
            />
          </label>
        ))}
      </section>

      <section className="panel">
        <h3>Agent Settings</h3>
        <label>
          Purpose
          <textarea
            value={draftConfig.agent.purpose}
            onChange={(event) => setDraftConfig({ ...draftConfig, agent: { ...draftConfig.agent, purpose: event.target.value } })}
            rows={4}
          />
        </label>
        <button className="primary" onClick={saveConfig} disabled={saving}>
          {saving ? "Saving..." : "Save Configuration"}
        </button>
      </section>
    </div>
  );
}

function AuditView({
  audits,
  selectedAudit,
  openAudit
}: {
  audits: AuditEvent[];
  selectedAudit: AuditEvent | null;
  openAudit: (id: string) => Promise<void>;
}) {
  return (
    <div className="audit-layout">
      <section className="panel audit-list">
        <h3>Recent Interactions</h3>
        {audits.length === 0 ? <p className="muted">No audit events yet. Run a demo query first.</p> : null}
        {audits.map((event) => (
          <button key={event.id} className="audit-row" onClick={() => openAudit(event.id)}>
            <span>{new Date(event.createdAt).toLocaleString()}</span>
            <strong>{event.role}</strong>
            <em>{event.query}</em>
            <small>{event.rawStatus} · {event.model}</small>
          </button>
        ))}
      </section>
      <section className="panel audit-detail">
        <h3>Audit Detail</h3>
        {selectedAudit ? (
          <>
            <TraceItem label="Prompt summary" value={selectedAudit.assembledPromptSummary} />
            <TraceItem label="Policy refs" value={selectedAudit.policyRefs.join(", ")} />
            <TraceItem label="Status" value={`${selectedAudit.rawStatus} / ${selectedAudit.model}`} />
            {selectedAudit.structuredResponse ? <StructuredAnswer response={selectedAudit.structuredResponse} /> : null}
          </>
        ) : (
          <p className="muted">Select an event to review its structured response and source trail.</p>
        )}
      </section>
    </div>
  );
}
