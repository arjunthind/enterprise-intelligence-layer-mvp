import { NextResponse } from "next/server";
import { readAudits } from "@/lib/db";

export async function GET() {
  const events = await readAudits();
  return NextResponse.json({ events });
}
