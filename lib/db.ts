import { Pool } from "pg";
import type { AuditEvent, ConfigPayload } from "./types";
import { addMemoryAudit, getMemoryAudit, getMemoryAudits, getMemoryConfig, updateMemoryConfig } from "./config-store";
import { seedConfig } from "./seed";

let pool: Pool | null = null;
let initialized = false;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function ensureDb() {
  const db = getPool();
  if (!db || initialized) return db;

  await db.query(`
    create table if not exists app_config (
      id text primary key,
      data jsonb not null,
      updated_at timestamptz not null default now()
    );
  `);
  await db.query(`
    create table if not exists audit_events (
      id text primary key,
      query text not null,
      role text not null,
      assembled_prompt_summary text not null,
      policy_refs jsonb not null,
      model text not null,
      raw_status text not null,
      structured_response jsonb,
      created_at timestamptz not null default now()
    );
  `);
  await db.query(
    `insert into app_config (id, data)
     values ('default', $1)
     on conflict (id) do nothing`,
    [JSON.stringify(seedConfig)]
  );
  initialized = true;
  return db;
}

export async function readConfig(): Promise<ConfigPayload> {
  const db = await ensureDb();
  if (!db) return getMemoryConfig();
  const result = await db.query("select data from app_config where id = 'default'");
  return result.rows[0]?.data ?? seedConfig;
}

export async function saveConfig(config: ConfigPayload): Promise<ConfigPayload> {
  const nextConfig = {
    ...config,
    tenant: {
      ...config.tenant,
      configVersion: config.tenant.configVersion + 1
    }
  };
  const db = await ensureDb();
  if (!db) return updateMemoryConfig(config);
  await db.query("update app_config set data = $1, updated_at = now() where id = 'default'", [JSON.stringify(nextConfig)]);
  return nextConfig;
}

export async function writeAudit(event: AuditEvent) {
  const db = await ensureDb();
  if (!db) {
    addMemoryAudit(event);
    return;
  }
  await db.query(
    `insert into audit_events
      (id, query, role, assembled_prompt_summary, policy_refs, model, raw_status, structured_response, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      event.id,
      event.query,
      event.role,
      event.assembledPromptSummary,
      JSON.stringify(event.policyRefs),
      event.model,
      event.rawStatus,
      event.structuredResponse ? JSON.stringify(event.structuredResponse) : null,
      event.createdAt
    ]
  );
}

export async function readAudits(): Promise<AuditEvent[]> {
  const db = await ensureDb();
  if (!db) return getMemoryAudits();
  const result = await db.query("select * from audit_events order by created_at desc limit 100");
  return result.rows.map(mapAuditRow);
}

export async function readAudit(id: string): Promise<AuditEvent | null> {
  const db = await ensureDb();
  if (!db) return getMemoryAudit(id);
  const result = await db.query("select * from audit_events where id = $1", [id]);
  return result.rows[0] ? mapAuditRow(result.rows[0]) : null;
}

function mapAuditRow(row: Record<string, unknown>): AuditEvent {
  return {
    id: String(row.id),
    query: String(row.query),
    role: row.role as AuditEvent["role"],
    assembledPromptSummary: String(row.assembled_prompt_summary),
    policyRefs: Array.isArray(row.policy_refs) ? (row.policy_refs as string[]) : [],
    model: String(row.model),
    rawStatus: String(row.raw_status),
    structuredResponse: (row.structured_response as AuditEvent["structuredResponse"]) ?? null,
    createdAt: new Date(String(row.created_at)).toISOString()
  };
}
