import { NextResponse } from "next/server";
import { errMsg, getTelegramUser, isAdmin, supabaseAdmin } from "@/lib/server";
async function ctx() { const user = await getTelegramUser(); if (!isAdmin(user.id)) throw new Error("Administrator access required"); return { user, db: supabaseAdmin() }; }
export async function GET() {
  try {
    const { db } = await ctx();
    const { data, error } = await db.from("withdrawals").select("id,telegram_id,amount_nano,fee_nano,net_nano,destination_wallet,status,tx_hash,created_at").order("created_at", { ascending: false }).limit(50);
    if (error) throw error;
    return NextResponse.json({ withdrawals: (data || []).map(w => ({ ...w, amount_nano: String(w.amount_nano), fee_nano: String(w.fee_nano), net_nano: w.net_nano === null ? null : String(w.net_nano) })) });
  } catch (e) { return NextResponse.json({ error: errMsg(e, "Forbidden") }, { status: 403 }); }
}
export async function POST(req: Request) {
  try {
    const { user, db } = await ctx(); const b = await req.json();
    const id = String(b.id || "");
    const { data, error } = b.action === "paid"
      ? await db.rpc("admin_complete_withdrawal", { p_admin: String(user.id), p_id: id, p_tx: String(b.tx_hash || "") })
      : await db.rpc("admin_reject_withdrawal", { p_admin: String(user.id), p_id: id, p_note: String(b.note || "") });
    if (error) throw error;
    return NextResponse.json({ result: data });
  } catch (e) { return NextResponse.json({ error: errMsg(e, "Failed") }, { status: 400 }); }
}
