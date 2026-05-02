import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { passcode } = (await request.json()) as { passcode?: string };
  if (process.env.DEMO_PASSCODE && passcode !== process.env.DEMO_PASSCODE) {
    return NextResponse.json({ ok: false, error: "Invalid demo passcode." }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
