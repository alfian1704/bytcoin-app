import { NextResponse } from "next/server";
import {
  errMsg,
  getTelegramUser,
  isAdmin,
  supabaseAdmin,
} from "@/lib/server";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TASK_TYPES = ["telegram_join", "manual"];

async function adminContext() {
  const user = await getTelegramUser();

  if (!isAdmin(user.id)) {
    throw new Error("Administrator access required");
  }

  return {
    user,
    db: supabaseAdmin(),
  };
}

function validTelegramUrl(value: string): boolean {
  try {
    const url = new URL(value);

    if (
      url.protocol !== "https:" ||
      !["t.me", "www.t.me"].includes(url.hostname)
    ) {
      return false;
    }

    const username = url.pathname.split("/").filter(Boolean)[0];

    return (
      !!username &&
      /^[a-zA-Z0-9_]{5,32}$/.test(username) &&
      !url.search &&
      !url.hash
    );
  } catch {
    return false;
  }
}

async function writeAudit(
  db: ReturnType<typeof supabaseAdmin>,
  actor: string,
  action: string,
  targetId: string,
  beforeData: unknown,
  afterData: unknown
) {
  const { error } = await db.from("audit_logs").insert({
    actor_telegram_id: actor,
    action,
    target_type: "task",
    target_id: targetId,
    before_data: beforeData,
    after_data: afterData,
  });

  if (error) {
    throw new Error("Task saved, but audit log recording failed.");
  }
}

export async function GET() {
  try {
    const { db } = await adminContext();

    const { data, error } = await db
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ tasks: data || [] });
  } catch (e) {
    return NextResponse.json(
      { error: errMsg(e, "Unable to load tasks") },
      { status: 403 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { user, db } = await adminContext();
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const slug =
      typeof body.slug === "string" ? body.slug.trim() : "";
    const title =
      typeof body.title === "string" ? body.title.trim() : "";
    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";
    const rewardNano = String(body.reward_nano ?? "");
    const taskType = body.task_type;
    const targetUrl =
      typeof body.target_url === "string"
        ? body.target_url.trim()
        : "";

    if (!SLUG_REGEX.test(slug) || slug.length > 80) {
      throw new Error("Invalid task slug.");
    }

    if (!title || title.length > 120) {
      throw new Error("Title is required and must be at most 120 characters.");
    }

    if (description.length > 1000) {
      throw new Error("Description is too long.");
    }

    if (!/^\d+$/.test(rewardNano) || BigInt(rewardNano) <= 0n) {
      throw new Error("Reward must be a positive nanoBYT integer.");
    }

    if (
      typeof taskType !== "string" ||
      !TASK_TYPES.includes(taskType)
    ) {
      throw new Error("Unsupported task type.");
    }

    if (taskType === "telegram_join") {
      if (!validTelegramUrl(targetUrl)) {
        throw new Error("Telegram task requires a valid public t.me URL.");
      }
    } else if (targetUrl) {
      try {
        const url = new URL(targetUrl);

        if (
          url.protocol !== "https:" ||
          !["http:", "https:"].includes(url.protocol)
        ) {
          throw new Error();
        }
      } catch {
        throw new Error("Invalid task URL.");
      }
    }

    const row = {
      slug,
      title,
      description: description || null,
      reward_nano: rewardNano,
      task_type: taskType,
      target_url: targetUrl || null,
      active: body.active === true,
    };

    if (typeof body.active !== "boolean") {
      throw new Error("Active must be a boolean.");
    }

    const { data, error } = await db
      .from("tasks")
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    await writeAudit(
      db,
      String(user.id),
      "task_created",
      data.id,
      null,
      data
    );

    return NextResponse.json({ task: data });
  } catch (e) {
    return NextResponse.json(
      { error: errMsg(e, "Unable to create task") },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { user, db } = await adminContext();
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    if (
      typeof body.id !== "string" ||
      !UUID_REGEX.test(body.id)
    ) {
      throw new Error("Invalid task ID.");
    }

    const allowed = ["title", "description", "reward_nano", "task_type",
      "target_url", "active", "starts_at", "ends_at", "max_claims",
      "per_user_limit"];

    const patch: Record<string, unknown> = {};

    for (const key of allowed) {
      if (body[key] !== undefined) {
        patch[key] = body[key];
      }
    }

    if (Object.keys(patch).length === 0) {
      throw new Error("No task changes provided.");
    }

    if (
      patch.title !== undefined &&
      (typeof patch.title !== "string" ||
        !patch.title.trim() ||
        patch.title.trim().length > 120)
    ) {
      throw new Error("Invalid task title.");
    }

    if (
      patch.reward_nano !== undefined &&
      (!/^\d+$/.test(String(patch.reward_nano)) ||
        BigInt(String(patch.reward_nano)) <= 0n)
    ) {
      throw new Error("Invalid task reward.");
    }

    if (
      patch.task_type !== undefined &&
      (typeof patch.task_type !== "string" ||
        !TASK_TYPES.includes(patch.task_type))
    ) {
      throw new Error("Unsupported task type.");
    }

    if (
      patch.active !== undefined &&
      typeof patch.active !== "boolean"
    ) {
      throw new Error("Active must be a boolean.");
    }

    if (
      patch.max_claims !== undefined &&
      patch.max_claims !== null &&
      (!Number.isSafeInteger(patch.max_claims) ||
        Number(patch.max_claims) < 1)
    ) {
      throw new Error("Invalid max_claims.");
    }

    if (
      patch.per_user_limit !== undefined &&
      (!Number.isSafeInteger(patch.per_user_limit) ||
        Number(patch.per_user_limit) !== 1)
    ) {
      throw new Error("per_user_limit must be 1.");
    }

    if (patch.target_url !== undefined && patch.target_url !== null) {
      if (typeof patch.target_url !== "string") {
        throw new Error("Invalid task URL.");
      }

      const { data: current } = await db
        .from("tasks")
        .select("task_type")
        .eq("id", body.id)
        .maybeSingle();

      const taskType =
        patch.task_type ?? current?.task_type;

      if (
        taskType === "telegram_join" &&
        !validTelegramUrl(patch.target_url)
      ) {
        throw new Error("Telegram task requires a valid public t.me URL.");
      }

      if (
        taskType === "manual" &&
        patch.target_url &&
        !/^https:\/\/[^\s]+$/i.test(patch.target_url)
      ) {
        throw new Error("Invalid task URL.");
      }
    }

    patch.updated_at = new Date().toISOString();

    const { data: before, error: readError } = await db
      .from("tasks")
      .select("*")
      .eq("id", body.id)
      .single();

    if (readError) throw readError;

    const { data, error } = await db
      .from("tasks")
      .update(patch)
      .eq("id", body.id)
      .select()
      .single();

    if (error) throw error;

    await writeAudit(
      db,
      String(user.id),
      "task_updated",
      body.id,
      before,
      data
    );

    return NextResponse.json({ task: data });
  } catch (e) {
    return NextResponse.json(
      { error: errMsg(e, "Unable to update task") },
      { status: 400 }
    );
  }
}
