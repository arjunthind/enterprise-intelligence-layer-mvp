import type { AuditEvent, ConfigPayload } from "./types";
import { seedConfig } from "./seed";

let memoryConfig: ConfigPayload = structuredClone(seedConfig);
let memoryAudit: AuditEvent[] = [];

export function getMemoryConfig() {
  return memoryConfig;
}

export function updateMemoryConfig(config: ConfigPayload) {
  memoryConfig = {
    ...config,
    tenant: {
      ...config.tenant,
      configVersion: config.tenant.configVersion + 1
    }
  };
  return memoryConfig;
}

export function addMemoryAudit(event: AuditEvent) {
  memoryAudit = [event, ...memoryAudit].slice(0, 100);
}

export function getMemoryAudits() {
  return memoryAudit;
}

export function getMemoryAudit(id: string) {
  return memoryAudit.find((event) => event.id === id) ?? null;
}
