import { NextResponse } from "next/server";
import { readConfig, writeAudit } from "@/lib/db";
import { buildErrorResponse, findRole, generateComparison, getModel, summarizePrompt, selectPolicies } from "@/lib/intelligence";
import type { AuditEvent } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as { query?: string; roleId?: string; mode?: "demo" | "live" | "auto" };
  const passcode = request.headers.get("x-demo-passcode");
  if (process.env.DEMO_PASSCODE && body.mode !== "demo" && passcode !== process.env.DEMO_PASSCODE) {
    return NextResponse.json({ error: "Invalid demo passcode." }, { status: 401 });
  }
  const query = body.query?.trim();
  if (!query || !body.roleId) {
    return NextResponse.json({ error: "query and roleId are required." }, { status: 400 });
  }

  const config = await readConfig();
  const role = findRole(config, body.roleId);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  try {
    const result = await generateComparison(config, role, query, body.mode ?? "auto");
    const audit: AuditEvent = {
      id,
      query,
      role: role.name,
      assembledPromptSummary: result.assembledPromptSummary,
      policyRefs: result.policyRefs,
      model: result.trace.model,
      rawStatus: result.rawStatus,
      structuredResponse: result.governedResponse,
      createdAt
    };
    await writeAudit(audit);
    return NextResponse.json({ ...result, auditId: id });
  } catch (error) {
    const policies = selectPolicies(config, query);
    const fallback = buildErrorResponse(error);
    const audit: AuditEvent = {
      id,
      query,
      role: role.name,
      assembledPromptSummary: summarizePrompt(config, role, policies),
      policyRefs: policies.map((policy) => policy.sourceLabel),
      model: getModel(),
      rawStatus: "error",
      structuredResponse: fallback,
      createdAt
    };
    await writeAudit(audit);
    return NextResponse.json(
      {
        genericResponse: "Generic response unavailable because the AI service returned an error.",
        governedResponse: fallback,
        trace: null,
        auditId: id,
        error: fallback.supportingRationale
      },
      { status: 502 }
    );
  }
}
