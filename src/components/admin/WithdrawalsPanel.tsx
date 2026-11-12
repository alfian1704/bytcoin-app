"use client";
import { useCallback, useEffect, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { fromNano } from "@/lib/config";
import { adminFetch, errText } from "./api";

type W = {
  id: string; telegram_id: string; amount_nano: string; fee_nano: string; net_nano: string | null;
  destination_wallet: string; status: string; tx_hash: string | null; created_at: string;
};
const FILTERS = ["pending", "paid", "rejected", "all"] as const;
type Filter = (typeof FILTERS)[number];

const open = (u: string) => { try { WebApp.openLink(u); } catch {} };

export default function WithdrawalsPanel() {
  const [rows, setRows] = useState<W[]>([]);
  const [filter, setFilter] = useState<Filter>("pending");
  const [tx, setTx] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const q = filter === "all" ? "" : `?status=${filter}`;
      const j = await adminFetch<{ withdrawals: W[] }>(`/api/admin/withdrawals${q}`);
      const list = j.withdrawals || [];
      setRows(filter === "all" ? list : list.filter(w => w.status === filter));
    } catch (e) { setMsg(errText(e)); }
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  async function act(id: string, action: "paid" | "reject") {
    if (action === "reject" && !window.confirm("Tolak penarikan ini? Saldo penuh dikembalikan ke user.")) return;
    setBusy(true); setMsg("");
    try {
      await adminFetch("/api/admin/withdrawals", {
        method: "POST",
        body: { id, action, tx_hash: (tx[id] || "").trim(), note: note[id] || "" }
      });
      setMsg(action === "paid" ? "Ditandai sudah dibayar." : "Ditolak, saldo dikembalikan.");
      await load();
    } catch (e) { setMsg(errText(e)); } finally { setBusy(false); }
  }

  return <>
    {msg ? <div className="notice" onClick={() => setMsg("")}>{msg}</div> : null}
    <div className="seg" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
      {FILTERS.map(x => <button key={x} className={filter === x ? "on" : ""} onClick={() => setFilter(x)}>{x}</button>)}
    </div>
    {rows.length ? rows.map(w => <div className="card" key={w.id}>
      <div className="row"><b>{fromNano(w.amount_nano)} BYT</b><span className="pill">{w.status}</span></div>
      <p className="sub">Kirim (net): <b className="gold">{fromNano(w.net_nano ?? w.amount_nano)} BYT</b> · fee {fromNano(w.fee_nano)}</p>
      <p className="sub" style={{ wordBreak: "break-all" }}>User {w.telegram_id}<br />Wallet: {w.destination_wallet}</p>
      <p className="sub">{new Date(w.created_at).toLocaleString()}</p>
      <button className="secondary" onClick={() => open(`https://tonviewer.com/${w.destination_wallet}`)}>Cek wallet di Tonviewer</button>
      {w.status === "pending" || w.status === "approved" ? <>
        <input placeholder="Hash transaksi (setelah Anda kirim)" value={tx[w.id] || ""} onChange={e => setTx({ ...tx, [w.id]: e.target.value })} />
        <input placeholder="Catatan penolakan (opsional)" value={note[w.id] || ""} onChange={e => setNote({ ...note, [w.id]: e.target.value })} />
        <div className="grid2">
          <button className="primary" disabled={busy || (tx[w.id] || "").trim().length < 20} onClick={() => act(w.id, "paid")}>SUDAH DIBAYAR</button>
          <button className="secondary" disabled={busy} onClick={() => act(w.id, "reject")}>TOLAK</button>
        </div>
      </> : w.tx_hash ? <p className="sub" style={{ wordBreak: "break-all" }}>Tx: {w.tx_hash}</p> : null}
    </div>) : <div className="card"><p className="sub">Tidak ada data.</p></div>}
  </>;
}