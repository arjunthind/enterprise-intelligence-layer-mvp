import { NextResponse } from "next/server";
import { readConfig, saveConfig } from "@/lib/db";
import type { ConfigPayload } from "@/lib/types";

export async function GET() {
  const config = await readConfig();
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  const passcode = request.headers.get("x-demo-passcode");
  if (process.env.DEMO_PASSCODE && passcode !== process.env.DEMO_PASSCODE) {
    return NextResponse.json({ error: "Invalid demo passcode." }, { status: 401 });
  }
  const payload = (await request.json()) as ConfigPayload;
  const config = await saveConfig(payload);
  return NextResponse.json(config);
}
