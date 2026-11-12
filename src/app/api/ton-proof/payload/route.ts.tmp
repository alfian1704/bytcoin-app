import { NextResponse } from "next/server";
import { getTelegramUser } from "@/lib/server";
import { makePayload } from "@/lib/tonproof";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getTelegramUser();
    return NextResponse.json({ payload: makePayload(String(user.id)) }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
}