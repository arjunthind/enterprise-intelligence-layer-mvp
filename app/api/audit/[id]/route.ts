import { NextResponse } from "next/server";
import { readAudit } from "@/lib/db";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const passcode = request.headers.get("x-demo-passcode");
  if (process.env.DEMO_PASSCODE && passcode !== process.env.DEMO_PASSCODE) {
    return NextResponse.json({ error: "Invalid demo passcode." }, { status: 401 });
  }
  const { id } = await context.params;
  const event = await readAudit(id);
  if (!event) return NextResponse.json({ error: "Audit event not found." }, { status: 404 });
  return NextResponse.json(event);
}
