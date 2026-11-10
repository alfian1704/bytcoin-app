"use client";
import { useCallback, useEffect, useState } from "react";
import { fromNano } from "@/lib/config";
import { adminFetch, errText } from "./api";

type Claim = {
  id: string; telegram_id: string; reward_nano: string; created_at: string;
  tasks: { title: string } | { title: string }[] | null;
};
const titleOf = (c: Claim) => (Array.isArray(c.tasks) ? c.tasks[0]?.title : c.tasks?.title) ?? "-";

export default function ClaimsPanel() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const j = await adminFetch<{ claims: Claim[] }>("/api/admin/task-claim"); setClaims(j.claims || []); }
    catch (e) { setMsg(errText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function review(id: string, approve: boolean) {
    setBusy(true); setMsg("");
    try {
      await adminFetch("/api/admin/task-claim", { method: "POST", body: { id, approve } });
      setMsg(approve ? "Disetujui, reward dikreditkan." : "Ditolak.");
      await load();
    } catch (e) { setMsg(errText(e)); } finally { setBusy(false); }
  }

  return <>
    {msg ? <div className="notice" onClick={() => setMsg("")}>{msg}</div> : null}
    <div className="card">
      {claims.length ? claims.map(c => <div className="task" key={c.id}>
        <div style={{ flex: 1 }}>
          <b>{titleOf(c)}</b>
          <div className="sub">User {c.telegram_id} · {new Date(c.created_at).toLocaleString()}</div>
          <small className="gold">+{fromNano(c.reward_nano)} BYC</small>
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          <button className="primary" style={{ padding: "8px 12px" }} disabled={busy} onClick={() => review(c.id, true)}>Setujui</button>
          <button className="secondary" style={{ padding: "8px 12px" }} disabled={busy} onClick={() => review(c.id, false)}>Tolak</button>
        </div>
      </div>) : <p className="sub">Tidak ada klaim yang menunggu.</p>}
    </div>
  </>;
}