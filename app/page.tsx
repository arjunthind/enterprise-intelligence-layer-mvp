"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { AuditEvent, ConfigPayload, GovernedResponse, ResponseMode, Trace } from "@/lib/types";

const defaultQuery = "Can I work remotely from another state for 3 months?";

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
  const [passcode, setPasscode] = useState("");
  const [mode, setMode] = useState<"demo" | "auto" | "live">("demo");
  const [activeView, setActiveView] = useState<"demo" | "admin" | "audit">("demo");
  const [result, setResult] = useState<AskResult | null>(null);
  const [audits, setAudits] = useState<AuditEvent[]>([]);
  const [selectedAudit, setSelectedAudit] = useState<AuditEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  const role = useMemo(() => config?.roles.find((item) => item.id === selectedRole), [config, selectedRole]);

  async function loadConfig() {
    const response = await fetch("/api/config");
    const payload = (await response.json()) as ConfigPayload;
    setConfig(payload);
    setDraftConfig(structuredClone(payload));
  }

  const loadAudits = useCallback(async (code = passcode) => {
    const response = await fetch("/api/audit", { headers: { "x-demo-passcode": code } });
    if (!response.ok) return;
    const payload = (await response.json()) as { events: AuditEvent[] };
    setAudits(payload.events);
  }, [passcode]);

  useEffect(() => {
    void loadConfig();
    void loadAudits();
  }, [loadAudits]);

  async function ask(event: FormEvent) {
    event.preventDefault();
    if (mode !== "demo" && !passcode) {
      setStatus("Enter the demo passcode to use Auto fallback or Live AI. Demo mode runs without a passcode.");
      return;
    }
    setLoading(true);
    setStatus("Assembling tenant rules, role guidance, policy context, and schema...");
    setResult(null);

    const response = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-demo-passcode": passcode },
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
    if (passcode) await loadAudits(passcode);
  }

  async function saveConfig() {
    if (!draftConfig) return;
    setSaving(true);
    const response = await fetch("/api/config", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-demo-passcode": passcode
      },
      body: JSON.stringify(draftConfig)
    });
    if (!response.ok) {
      setStatus("Config save failed. Check the demo passcode.");
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
    const response = await fetch(`/api/audit/${id}`, { headers: { "x-demo-passcode": passcode } });
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
        <label className="passcode">
          Passcode for Admin, Audit, and Live AI
          <input
            type="password"
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
            placeholder="Optional for Demo mode"
          />
        </label>
        <div className="tenant-card">
          <span>Tenant</span>
          <strong>{config.tenant.tenantName}</strong>
          <small>Config v{config.tenant.configVersion}</small>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">{activeView === "demo" ? "HR Policy Assistant" : activeView === "admin" ? "Control Plane" : "Governance Log"}</p>
            <h2>{activeView === "demo" ? "Compare Generic AI vs Governed AI" : activeView === "admin" ? "Tenant Rulebook and Agent Controls" : "Auditable AI Interactions"}</h2>
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
            ask={ask}
          />
        ) : null}

        {activeView === "admin" ? (
          <AdminView
            draftConfig={draftConfig}
            setDraftConfig={setDraftConfig}
            passcode={passcode}
            setPasscode={setPasscode}
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
  ask
}: {
  config: ConfigPayload;
  roleId: string;
  roleName: string;
  query: string;
  mode: "demo" | "auto" | "live";
  result: AskResult | null;
  loading: boolean;
  setRoleId: (roleId: string) => void;
  setQuery: (query: string) => void;
  setMode: (mode: "demo" | "auto" | "live") => void;
  ask: (event: FormEvent) => Promise<void>;
}) {
  return (
    <div className="stack">
      <form className="query-panel" onSubmit={ask}>
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
        <div className="mode-row" aria-label="Response mode">
          <button type="button" className={mode === "demo" ? "selected" : ""} onClick={() => setMode("demo")}>
            Demo mode
          </button>
          <button type="button" className={mode === "auto" ? "selected" : ""} onClick={() => setMode("auto")}>
            Auto fallback
          </button>
          <button type="button" className={mode === "live" ? "selected" : ""} onClick={() => setMode("live")}>
            Live AI
          </button>
        </div>
        <p className="mode-note">
          Demo mode is open for quick review. Passcode is only needed for Admin, Audit, Auto fallback, or Live AI.
        </p>
        <label>
          User request
          <textarea value={query} onChange={(event) => setQuery(event.target.value)} rows={4} />
        </label>
        <button className="primary" disabled={loading}>
          {loading ? "Generating..." : "Run Intelligence Layer"}
        </button>
      </form>

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
  passcode,
  setPasscode,
  saveConfig,
  saving
}: {
  draftConfig: ConfigPayload;
  setDraftConfig: (config: ConfigPayload) => void;
  passcode: string;
  setPasscode: (value: string) => void;
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
        <label>
          Demo passcode
          <input type="password" value={passcode} onChange={(event) => setPasscode(event.target.value)} placeholder="Required when DEMO_PASSCODE is set" />
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
