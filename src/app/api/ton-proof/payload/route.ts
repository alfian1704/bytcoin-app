import { NextResponse } from "next/server";
import { getTelegramUser } from "@/lib/server";
import { makePayload } from "@/lib/tonproof";
export async function GET() {
  try { await getTelegramUser(); return NextResponse.json({ payload: makePayload() }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "Unauthorized" }, { status: 401 }); }
}
