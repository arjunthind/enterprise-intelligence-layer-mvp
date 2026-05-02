import type { AgentConfig, ConfigPayload, PolicyDocument, RoleConfig, TenantConfig } from "./types";

export const seedTenant: TenantConfig = {
  id: "northstar",
  tenantName: "Northstar Health Systems",
  industry: "Regional healthcare provider",
  tone: "Clear, cautious, policy-backed, and empathetic",
  constraints: [
    "Never imply legal, tax, payroll, or benefits approval without HR confirmation.",
    "For out-of-state remote work, flag payroll, tax, workers compensation, licensing, data security, and manager approval considerations.",
    "Prefer specific policy-backed guidance over generic flexibility language.",
    "Escalate requests longer than 30 calendar days or involving protected health information access from a non-approved location."
  ],
  restrictedTopics: [
    "Immigration advice",
    "Personal medical diagnosis",
    "Legal conclusions",
    "Payroll tax determinations"
  ],
  configVersion: 1
};

export const seedRoles: RoleConfig[] = [
  {
    id: "employee",
    name: "Employee",
    permissions: ["View policy guidance", "Request next steps"],
    responseGuidance:
      "Give practical employee-facing guidance. Do not expose administrative controls or compliance-only reasoning beyond what the employee needs to act."
  },
  {
    id: "manager",
    name: "Manager",
    permissions: ["View policy guidance", "Evaluate team impact", "Recommend escalation"],
    responseGuidance:
      "Include manager approval criteria, team coverage considerations, equity across staff, and escalation triggers."
  },
  {
    id: "hr-admin",
    name: "HR Admin",
    permissions: ["View policy guidance", "See HR process steps", "Review employee eligibility considerations"],
    responseGuidance:
      "Include HR workflow steps, documentation needed, policy exceptions, and where legal or payroll review is required."
  },
  {
    id: "compliance",
    name: "Compliance",
    permissions: ["View policy guidance", "Review risk controls", "Flag audit considerations"],
    responseGuidance:
      "Prioritize risk posture, auditable evidence, source references, PHI/data handling, and conditions that require formal review."
  }
];

export const seedAgent: AgentConfig = {
  id: "hr-policy-assistant",
  name: "HR Policy Assistant",
  purpose:
    "Answer employee mobility, remote work, leave, and workplace policy questions using only approved Northstar HR policy content.",
  approvedDataSources: ["Remote Work Policy", "Data Security Addendum", "Employee Mobility Checklist"],
  outputExpectations: [
    "Structured answer",
    "Policy-backed rationale",
    "Source references",
    "Risks or limitations",
    "Recommended next steps"
  ]
};

export const seedPolicies: PolicyDocument[] = [
  {
    id: "remote-work",
    title: "Remote Work Policy",
    category: "Workplace Flexibility",
    sourceLabel: "HR-POL-018",
    effectiveDate: "2026-01-01",
    content:
      "Employees may work remotely from their approved home state for routine flexibility with manager approval. Temporary out-of-state remote work beyond 30 calendar days requires HR review before approval. Requests must include location, dates, job duties, manager acknowledgement, and whether regulated data or patient information will be accessed."
  },
  {
    id: "mobility-checklist",
    title: "Employee Mobility Checklist",
    category: "HR Operations",
    sourceLabel: "HR-CHK-044",
    effectiveDate: "2026-01-15",
    content:
      "HR must review payroll registration, state tax withholding, workers compensation coverage, benefits eligibility, equipment shipping, and applicable local labor requirements before approving an employee to work from another state for more than 30 days."
  },
  {
    id: "data-security",
    title: "Remote Data Security Addendum",
    category: "Security",
    sourceLabel: "SEC-ADD-012",
    effectiveDate: "2025-11-01",
    content:
      "Employees accessing patient information or sensitive company systems while remote must use company-managed devices, approved VPN, multifactor authentication, and private networks. Access from unapproved jurisdictions or shared public networks requires Security review."
  }
];

export const seedConfig: ConfigPayload = {
  tenant: seedTenant,
  roles: seedRoles,
  agent: seedAgent,
  policies: seedPolicies
};
