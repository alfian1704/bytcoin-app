import { NextResponse } from "next/server";
import { errMsg, getTelegramUser, supabaseAdmin } from "@/lib/server";
export async function POST() {
  try {
    const user = await getTelegramUser(); const db = supabaseAdmin();
    const { data, error } = await db.rpc("start_mining_session", { p_telegram_id: String(user.id) });
    if (error) throw error;
    return NextResponse.json({ session: data });
  } catch (e) { return NextResponse.json({ error: errMsg(e, "Unable to start mining") }, { status: 400 }); }
}
