import { NextResponse } from "next/server";
import { readAudits } from "@/lib/db";

export async function GET(request: Request) {
  const passcode = request.headers.get("x-demo-passcode");
  if (process.env.DEMO_PASSCODE && passcode !== process.env.DEMO_PASSCODE) {
    return NextResponse.json({ error: "Invalid demo passcode." }, { status: 401 });
  }
  const events = await readAudits();
  return NextResponse.json({ events });
}
