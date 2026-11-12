import { NextResponse } from "next/server";
import { errMsg, getTelegramUser, supabaseAdmin } from "@/lib/server";
export async function GET() {
  try {
    const user = await getTelegramUser(); const db = supabaseAdmin();
    const { data, error } = await db.from("mining_sessions").select("id,ends_at,status,started_at").eq("telegram_id", String(user.id)).eq("status", "active").order("started_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error; return NextResponse.json({ session: data });
  } catch (e) { return NextResponse.json({ error: errMsg(e, "Unable to load mining status") }, { status: 400 }); }
}
