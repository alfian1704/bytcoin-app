import { NextResponse } from "next/server";
import {
  errMsg,
  getTelegramUser,
  isAdmin,
  supabaseAdmin,
} from "@/lib/server";

async function ctx() {
  const user = await getTelegramUser();

  if (!isAdmin(user.id)) {
    throw new Error("Administrator access required");
  }

  return {
    user,
    db: supabaseAdmin(),
  };
}

export async function GET() {
  try {
    const { db } = await ctx();

    const { data, error } = await db
      .from("task_claims")
      .select(
        "id,telegram_id,reward_nano,created_at,tasks(title,slug)"
      )
      .eq("status", "pending")
      .order("created_at")
      .limit(50);

    if (error) throw error;

    return NextResponse.json({
      claims: (data || []).map((c) => ({
        ...c,
        reward_nano: String(c.reward_nano),
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: errMsg(e, "Forbidden") },
      { status: 403 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { user, db } = await ctx();

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    if (
      typeof body.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        body.id
      )
    ) {
      return NextResponse.json(
        { error: "Invalid claim ID." },
        { status: 400 }
      );
    }

    if (typeof body.approve !== "boolean") {
      return NextResponse.json(
        { error: "Approval must be a boolean." },
        { status: 400 }
      );
    }

    const { data, error } = await db.rpc(
      "admin_review_task_claim",
      {
        p_admin: String(user.id),
        p_claim: body.id,
        p_approve: body.approve,
      }
    );

    if (error) throw error;

    return NextResponse.json({ result: data });
  } catch (e) {
    return NextResponse.json(
      { error: errMsg(e, "Failed") },
      { status: 400 }
    );
  }
}
