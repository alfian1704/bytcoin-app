"use client";
import { useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { fromNano } from "@/lib/config";
type W = { id: string; telegram_id: string; amount_nano: string; fee_nano: string; net_nano: string | null; destination_wallet: string; status: string; tx_hash: string | null };
type C = { id: string; telegram_id: string; reward_nano: string; tasks: { title: string } | { title: string }[] | null };
export function AdminReviews() {
  const [ws, setWs] = useState<W[]>([]), [cs, setCs] = useState<C[]>([]), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false), [tx, setTx] = useState<Record<string, string>>({});
  const headers = () => ({ "Content-Type": "application/json", "x-telegram-init-data": WebApp.initData || "" });
  async function load() {
    const a = await fetch("/api/admin/withdrawals", { headers: headers() }); const aj = await a.json(); if (!a.ok) throw new Error(aj.error); setWs(aj.withdrawals);
    const b = await fetch("/api/admin/task-claims", { headers: headers() }); const bj = await b.json(); if (b.ok) setCs(bj.claims);
  }
  useEffect(() => { load().catch(e => setMsg(e.message)); }, []);
  async function post(url: string, body: unknown) {
    setBusy(true); setMsg("");
    try { const r = await fetch(url, { method: "POST", headers: headers(), body: JSON.stringify(body) }); const j = await r.json(); if (!r.ok) throw new Error(j.error); await load(); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  const title = (c: C) => Array.isArray(c.tasks) ? c.tasks[0]?.title : c.tasks?.title;
  return <div className="app" style={{ minHeight: 0, paddingTop: 0 }}>
    {msg && <div className="notice">{msg}</div>}
    <section className="card"><h2>Withdrawals</h2><p className="sub">Send BYC from your treasury wallet to the address shown, then paste the transaction hash and press Paid. Reject refunds the user balance.</p>
      {ws.map(w => <div className="task" key={w.id} style={{ display: "block" }}><b>SEND {fromNano(w.net_nano ?? w.amount_nano)} BYC</b> <span className="pill">{w.status}</span> <span className="sub">(requested {fromNano(w.amount_nano)}, fee kept {fromNano(w.fee_nano)})</span>
        <div className="sub" style={{ wordBreak: "break-all" }}>User {w.telegram_id} → {w.destination_wallet}</div>
        {w.status === "pending" && <><input placeholder="Transaction hash" value={tx[w.id] || ""} onChange={e => setTx({ ...tx, [w.id]: e.target.value })} />
          <div className="grid2"><button className="primary" disabled={busy} onClick={() => post("/api/admin/withdrawals", { id: w.id, action: "paid", tx_hash: tx[w.id] })}>PAID</button>
          <button className="secondary" disabled={busy} onClick={() => post("/api/admin/withdrawals", { id: w.id, action: "reject", note: "Rejected by admin" })}>REJECT</button></div></>}
        {w.tx_hash && <div className="sub" style={{ wordBreak: "break-all" }}>tx: {w.tx_hash}</div>}</div>)}
      {!ws.length && <p className="sub">No withdrawals.</p>}</section>
    <section className="card"><h2>Task claims to review</h2>
      {cs.map(c => <div className="task" key={c.id}><div style={{ flex: 1 }}><b>{title(c)}</b><div className="sub">User {c.telegram_id} · {fromNano(c.reward_nano)} BYC</div></div>
        <button className="pill" disabled={busy} onClick={() => post("/api/admin/task-claims", { id: c.id, approve: true })}>Approve</button>
        <button className="pill" disabled={busy} onClick={() => post("/api/admin/task-claims", { id: c.id, approve: false })}>Reject</button></div>)}
      {!cs.length && <p className="sub">Nothing pending.</p>}</section></div>;
}
