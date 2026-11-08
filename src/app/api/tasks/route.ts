import { NextResponse } from "next/server";
import { errMsg, getTelegramUser, supabaseAdmin } from "@/lib/server";
export async function GET() {
  try {
    const user = await getTelegramUser();
    const db = supabaseAdmin();
    const { data, error } = await db.from("tasks").select("id,slug,title,description,reward_nano,task_type,target_url,starts_at,ends_at").eq("active", true).order("created_at", { ascending: false });
    if (error) throw error;
    const { data: claims } = await db.from("task_claims").select("task_id,status").eq("telegram_id", String(user.id));
    const status = new Map((claims || []).map(c => [c.task_id, c.status as string]));
    const now = Date.now();
    const tasks = (data || [])
      .filter(t => (!t.starts_at || new Date(t.starts_at).getTime() <= now) && (!t.ends_at || new Date(t.ends_at).getTime() >= now))
      .map(t => ({ ...t, reward_nano: String(t.reward_nano), claim_status: status.get(t.id) || null }));
    return NextResponse.json({ tasks });
  } catch (e) { return NextResponse.json({ error: errMsg(e, "Unable to load tasks") }, { status: 400 }); }
}
