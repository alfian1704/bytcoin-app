import { NextResponse } from "next/server";
import {
  errMsg,
  getTelegramUser,
  supabaseAdmin,
} from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getTelegramUser();
    const db = supabaseAdmin();

    const { data, error } = await db
      .from("tasks")
      .select(
        "id,slug,title,description,reward_nano,task_type,target_url,starts_at,ends_at,max_claims"
      )
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const now = Date.now();

    const availableTasks = (data || []).filter(
      (task) =>
        (!task.starts_at ||
          new Date(task.starts_at).getTime() <= now) &&
        (!task.ends_at ||
          new Date(task.ends_at).getTime() >= now)
    );

    if (availableTasks.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    const taskIds = availableTasks.map((task) => task.id);

    const {
      data: claims,
      error: claimsError,
    } = await db
      .from("task_claims")
      .select("task_id,status")
      .eq("telegram_id", String(user.id))
      .in("task_id", taskIds);

    if (claimsError) throw claimsError;

    const status = new Map(
      (claims || []).map((claim) => [
        claim.task_id,
        claim.status,
      ])
    );

    const tasks = await Promise.all(
      availableTasks.map(async (task) => {
        if (task.max_claims !== null) {
          const { count, error: countError } = await db
            .from("task_claims")
            .select("id", { count: "exact", head: true })
            .eq("task_id", task.id)
            .in("status", ["pending", "approved", "paid"]);

          if (countError) throw countError;

          if ((count ?? 0) >= task.max_claims) {
            return null;
          }
        }

        return {
          ...task,
          reward_nano: String(task.reward_nano),
          claim_status: status.get(task.id) || null,
        };
      })
    );

    return NextResponse.json({
      tasks: tasks.filter((task) => task !== null),
    });
  } catch (e) {
    return NextResponse.json(
      { error: errMsg(e, "Unable to load tasks") },
      { status: 400 }
    );
  }
}
