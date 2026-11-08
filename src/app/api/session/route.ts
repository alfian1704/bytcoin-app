import { NextResponse } from "next/server";
import { errMsg, getTelegramUser, supabaseAdmin } from "@/lib/server";
export async function GET() {
  try {
    const user = await getTelegramUser();
    const db = supabaseAdmin();
    const ref = user.start_param && /^ref_\d{1,20}$/.test(user.start_param) ? user.start_param.slice(4) : null;
    const { error } = await db.rpc("ensure_profile", {
      p_tid: String(user.id), p_username: user.username || null, p_first: user.first_name, p_last: user.last_name || null, p_referrer: ref
    });
    if (error) throw error;
    const { data, error: e2 } = await db.rpc("get_profile", { p_tid: String(user.id) });
    if (e2) throw e2;
    return NextResponse.json({ user: { id: user.id, first_name: user.first_name }, data });
  } catch (e) { return NextResponse.json({ error: errMsg(e, "Unauthorized") }, { status: 401 }); }
}
