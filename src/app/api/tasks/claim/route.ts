import { NextResponse } from "next/server";
import {
  errMsg,
  getTelegramUser,
  supabaseAdmin,
} from "@/lib/server";
import { isChatMember } from "@/lib/telegram";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getTelegramUsername(targetUrl: string): string | null {
  try {
    const url = new URL(targetUrl);

    if (
      url.protocol !== "https:" ||
      !["t.me", "www.t.me"].includes(url.hostname)
    ) {
      return null;
    }

    const username = url.pathname.split("/").filter(Boolean)[0];

    if (!username || !/^[a-zA-Z0-9_]{5,32}$/.test(username)) {
      return null;
    }

    return username;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  let user;

  try {
    user = await getTelegramUser();
  } catch {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => null);

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    if (
      typeof body.taskId !== "string" ||
      !UUID_REGEX.test(body.taskId)
    ) {
      return NextResponse.json(
        { error: "Invalid task ID." },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();

    const { data: task, error: taskError } = await db
      .from("tasks")
      .select("id,task_type,target_url")
      .eq("id", body.taskId)
      .eq("active", true)
      .maybeSingle();

    if (taskError) throw taskError;

    if (!task) {
      return NextResponse.json(
        { error: "Task not found or inactive." },
        { status: 404 }
      );
    }

    let verified = false;

    if (task.task_type === "telegram_join") {
      if (!task.target_url) {
        throw new Error("Task Telegram URL is not configured.");
      }

      const username = getTelegramUsername(task.target_url);

      if (!username) {
        throw new Error("Invalid public Telegram channel/group URL.");
      }

      verified = await isChatMember(username, user.id);

      if (!verified) {
        throw new Error(
          "Join the Telegram channel/group before claiming."
        );
      }
    } else if (task.task_type !== "manual") {
      throw new Error("Unsupported task type.");
    }

    const { data, error } = await db.rpc("claim_task", {
      p_telegram_id: String(user.id),
      p_task_id: body.taskId,
      p_verified: verified,
    });

    if (error) throw error;

    return NextResponse.json({ result: data });
  } catch (e) {
    return NextResponse.json(
      { error: errMsg(e, "Task claim failed") },
      { status: 400 }
    );
  }
}
