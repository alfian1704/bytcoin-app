"use client";
import { useCallback, useEffect, useState } from "react";
import { fromNano, toNano } from "@/lib/config";
import { adminFetch, errText } from "./api";

type Task = {
  id: string; slug: string; title: string; description: string | null;
  reward_nano: string | number; task_type: string; target_url: string | null; active: boolean;
};

const empty = { slug: "", title: "", description: "", reward: "", task_type: "telegram_join", target_url: "" };
const selectStyle = { width: "100%", background: "#090908", border: "1px solid #393326", borderRadius: 11, padding: 13, color: "white", margin: "7px 0 12px" } as const;

export default function TasksPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { const j = await adminFetch<{ tasks: Task[] }>("/api/admin/tasks"); setTasks(j.tasks || []); }
    catch (e) { setMsg(errText(e)); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create() {
    setBusy(true); setMsg("");
    try {
      const reward_nano = toNano(f.reward || "0").toString();
      await adminFetch("/api/admin/tasks", {
        method: "POST",
        body: { slug: f.slug.trim(), title: f.title.trim(), description: f.description, reward_nano, task_type: f.task_type, target_url: f.target_url.trim() || null, active: true }
      });
      setF(empty); setMsg("Task dibuat."); await load();
    } catch (e) { setMsg(errText(e)); } finally { setBusy(false); }
  }

  async function toggle(t: Task) {
    setBusy(true); setMsg("");
    try { await adminFetch("/api/admin/tasks", { method: "PATCH", body: { id: t.id, active: !t.active } }); await load(); }
    catch (e) { setMsg(errText(e)); } finally { setBusy(false); }
  }

  return <>
    {msg ? <div className="notice" onClick={() => setMsg("")}>{msg}</div> : null}
    <div className="card">
      <div className="label">Buat task baru</div>
      <input placeholder="slug (huruf kecil, tanpa spasi), contoh: join-channel" value={f.slug} onChange={e => setF({ ...f, slug: e.target.value })} />
      <input placeholder="Judul" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
      <input placeholder="Deskripsi" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
      <input inputMode="decimal" placeholder="Reward dalam BYC, contoh: 0.21" value={f.reward} onChange={e => setF({ ...f, reward: e.target.value })} />
      <select style={selectStyle} value={f.task_type} onChange={e => setF({ ...f, task_type: e.target.value })}>
        <option value="telegram_join">telegram_join (otomatis)</option>
        <option value="manual">manual (direview admin)</option>
      </select>
      <input placeholder="Link, contoh: https://t.me/namachannel" value={f.target_url} onChange={e => setF({ ...f, target_url: e.target.value })} />
      <button className="primary" disabled={busy || !f.slug.trim() || !f.title.trim()} onClick={create}>BUAT TASK</button>
    </div>

    <div className="sectionTitle">Daftar task</div>
    <div className="card">
      {tasks.length ? tasks.map(t => <div className="task" key={t.id}>
        <div style={{ flex: 1 }}>
          <b>{t.title}</b>
          <div className="sub">{t.slug} · {t.task_type}</div>
          <small className="gold">+{fromNano(t.reward_nano)} BYC</small>
        </div>
        <button className="secondary" style={{ width: "auto" }} disabled={busy} onClick={() => toggle(t)}>{t.active ? "Nonaktifkan" : "Aktifkan"}</button>
      </div>) : <p className="sub">Belum ada task.</p>}
    </div>
  </>;
}