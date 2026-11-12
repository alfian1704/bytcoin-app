import { NextResponse } from "next/server";
import { getTelegramUser, isAdmin, safeErr, supabaseAdmin } from "@/lib/server";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ctx() {
  let user;
  try { user = await getTelegramUser(); } catch { throw Object.assign(new Error("Unauthorized"), { code: 401 }); }
  if (!isAdmin(user.id)) throw Object.assign(new Error("Administrator access required"), { code: 403 });
  return { user, db: supabaseAdmin() };
}
const status = (e: unknown, d: number) => (e as { code?: number })?.code === 401 || (e as { code?: number })?.code === 403 ? (e as { code: number }).code : d;

export async function GET(req: Request) {
  try {
    const { db } = await ctx();
    const st = new URL(req.url).searchParams.get("status");
    let q = db.from("withdrawals").select("id,telegram_id,amount_nano,fee_nano,net_nano,destination_wallet,status,tx_hash,created_at").order("created_at", { ascending: false }).limit(100);
    if (st && ["pending", "approved", "rejected", "paid"].includes(st)) q = q.eq("status", st);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ withdrawals: (data || []).map(w => ({ ...w, amount_nano: String(w.amount_nano), fee_nano: String(w.fee_nano), net_nano: w.net_nano === null ? null : String(w.net_nano) })) });
  } catch (e) { return NextResponse.json({ error: safeErr(e, "Forbidden") }, { status: status(e, 500) }); }
}

export async function POST(req: Request) {
  try {
    const { user, db } = await ctx(); const b = await req.json();
    const id = String(b.id || "");
    if (!UUID.test(id)) throw new Error("Invalid withdrawal id.");
    if (b.action !== "paid" && b.action !== "reject") throw new Error("Action must be 'paid' or 'reject'.");
    if (b.action === "paid" && !/^[A-Za-z0-9+/=_-]{20,128}$/.test(String(b.tx_hash || "").trim())) throw new Error("Valid transaction hash is required.");
    const { data, error } = b.action === "paid"
      ? await db.rpc("admin_complete_withdrawal", { p_admin: String(user.id), p_id: id, p_tx: String(b.tx_hash).trim() })
      : await db.rpc("admin_reject_withdrawal", { p_admin: String(user.id), p_id: id, p_note: String(b.note || "") });
    if (error) throw error;
    return NextResponse.json({ result: data });
  } catch (e) { return NextResponse.json({ error: safeErr(e, "Failed") }, { status: status(e, 400) }); }
}