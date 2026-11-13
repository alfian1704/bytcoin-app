import { NextRequest, NextResponse } from "next/server";
import { MIN_WITHDRAWAL, MAX_WITHDRAWAL } from "@/lib/config";
export async function POST(req: NextRequest) {
  const body = await req.json();
  const amount = BigInt(String(body.amountNano || "0"));
  if (amount < MIN_WITHDRAWAL) return NextResponse.json({ error: "min" }, { status: 400 });
  if (amount > MAX_WITHDRAWAL) return NextResponse.json({ error: "max" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
