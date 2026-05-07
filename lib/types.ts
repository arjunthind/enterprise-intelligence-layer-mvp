export type RoleName = "Employee" | "Manager" | "HR Admin" | "Compliance";

export type TenantConfig = {
  id: string;
  tenantName: string;
  industry: string;
  tone: string;
  constraints: string[];
  restrictedTopics: string[];
  configVersion: number;
};

export type RoleConfig = {
  id: string;
  name: RoleName;
  permissions: string[];
  responseGuidance: string;
};

export type AgentConfig = {
  id: string;
  name: string;
  purpose: string;
  approvedDataSources: string[];
  outputExpectations: string[];
};

export type PolicyDocument = {
  id: string;
  title: string;
  category: string;
  content: string;
  sourceLabel: string;
  effectiveDate: string;
};

export type GovernedResponse = {
  answer: string;
  supportingRationale: string;
  sourceReferences: string[];
  risksOrLimitations: string[];
  recommendedNextSteps: string[];
  confidence: "Low" | "Medium" | "High";
  escalationRequired: boolean;
};

export type Trace = {
  tenant: Pick<TenantConfig, "tenantName" | "industry" | "tone" | "configVersion">;
  agent: {
    id: string;
    name: string;
    routingMode: "Automatic" | "Manual";
  };
  role: Pick<RoleConfig, "name" | "permissions" | "responseGuidance">;
  policies: Array<Pick<PolicyDocument, "title" | "sourceLabel" | "effectiveDate">>;
  constraints: string[];
  restrictedTopics: string[];
  model: string;
  outputSchema: string[];
};

export type ResponseMode = "Demo" | "Live AI" | "Demo fallback";

export type ConfigPayload = {
  tenant: TenantConfig;
  roles: RoleConfig[];
  agent: AgentConfig;
  policies: PolicyDocument[];
};

export type AuditEvent = {
  id: string;
  query: string;
  role: RoleName;
  assembledPromptSummary: string;
  policyRefs: string[];
  model: string;
  rawStatus: string;
  structuredResponse: GovernedResponse | null;
  createdAt: string;
};
