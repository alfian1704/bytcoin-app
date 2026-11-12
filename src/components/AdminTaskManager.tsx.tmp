"use client";
import { useState } from "react";
import TasksPanel from "./admin/TasksPanel";
import ClaimsPanel from "./admin/ClaimsPanel";
import WithdrawalsPanel from "./admin/WithdrawalsPanel";

const TABS = [
  { id: "withdrawals", label: "Withdraw" },
  { id: "claims", label: "Klaim task" },
  { id: "tasks", label: "Task" }
] as const;

export default function AdminTaskManager() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("withdrawals");
  return <main className="app">
    <header className="top">
      <div className="brand"><div className="coin">B</div><div><strong>BYTCOIN</strong><small>ADMIN</small></div></div>
      <a className="pill" href="/">← App</a>
    </header>
    <div className="seg" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
      {TABS.map(x => <button key={x.id} className={tab === x.id ? "on" : ""} onClick={() => setTab(x.id)}>{x.label}</button>)}
    </div>
    {tab === "withdrawals" ? <WithdrawalsPanel /> : tab === "claims" ? <ClaimsPanel /> : <TasksPanel />}
  </main>;
}