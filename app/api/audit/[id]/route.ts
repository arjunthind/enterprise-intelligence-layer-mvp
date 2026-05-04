import { NextResponse } from "next/server";
import { readAudit } from "@/lib/db";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const event = await readAudit(id);
  if (!event) return NextResponse.json({ error: "Audit event not found." }, { status: 404 });
  return NextResponse.json(event);
}
