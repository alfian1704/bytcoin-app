import { NextResponse } from "next/server";
import { errMsg, getTelegramUser, supabaseAdmin } from "@/lib/server";
import { isChatMember } from "@/lib/telegram";
export async function POST(req: Request) {
  try {
    const user = await getTelegramUser();
    const { taskId } = await req.json();
    if (!/^[0-9a-f-]{36}$/i.test(String(taskId || ""))) throw new Error("Invalid task.");
    const db = supabaseAdmin();
    const { data: task, error: te } = await db.from("tasks").select("id,task_type,target_url").eq("id", taskId).eq("active", true).single();
    if (te || !task) throw new Error("Task not available.");
    let verified = false;
    if (task.task_type === "telegram_join") {
      const m = /t\.me\/([A-Za-z][A-Za-z0-9_]{3,})\/?$/.exec(task.target_url || "");
      if (!m) throw new Error("This task needs a public t.me/username link to be verified.");
      if (!(await isChatMember(m[1], user.id))) throw new Error("Join the channel/group first, then press Claim again.");
      verified = true;
    } // every other type is queued for admin review (no reward from a click alone)
    const { data, error } = await db.rpc("claim_task", { p_telegram_id: String(user.id), p_task_id: taskId, p_verified: verified });
    if (error) throw error;
    return NextResponse.json({ claim: data });
  } catch (e) { return NextResponse.json({ error: errMsg(e, "Unable to claim task") }, { status: 400 }); }
}
