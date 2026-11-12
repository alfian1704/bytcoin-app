"use client";
import { useEffect, useState } from "react";
import { ALLOCATION, JETTON_MASTER } from "@/lib/config";
import { WP, type Lang } from "@/lib/i18n";

export function Whitepaper() {
  const [lang, setLang] = useState<Lang>("id");
  useEffect(() => { try { const l = localStorage.getItem("byc_lang"); if (l === "en" || l === "id") setLang(l); } catch {} }, []);
  const switchLang = (l: Lang) => { setLang(l); try { localStorage.setItem("byc_lang", l); } catch {} };
  const d = WP[lang];
  return <main className="app wp">
    <header className="top"><div className="brand"><div className="coin">B</div><div><strong>BYTCOIN</strong><small>WHITEPAPER</small></div></div>
      <button className="lang" onClick={() => switchLang(lang === "id" ? "en" : "id")}>{lang === "id" ? "EN" : "ID"}</button></header>
    <h1>{d.title}</h1><p className="sub">{d.sub}</p>
    {d.sections.map(s => <section key={s.h}><h2>{s.h}</h2>
      {s.p?.map((t, i) => <p key={i}>{t}</p>)}
      {s.ul && <ul>{s.ul.map((t, i) => <li key={i}>{t}</li>)}</ul>}
      {s.h.startsWith("2.") && <div className="card"><table><thead><tr>{d.alloc.head.map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{ALLOCATION.map(a => <tr key={a.key}><td>{d.alloc.names[a.key]}</td><td>{a.amount.toLocaleString(lang === "id" ? "id-ID" : "en-US")}</td><td>{a.pct}%</td></tr>)}
          <tr><td><b>Total</b></td><td><b>{(21_000_000).toLocaleString(lang === "id" ? "id-ID" : "en-US")}</b></td><td><b>100%</b></td></tr></tbody></table></div>}
    </section>)}
    <div className="notice" style={{ marginTop: 18 }}>{d.disclaimer}</div>
    <p className="sub" style={{ wordBreak: "break-all" }}>Jetton Master: <a className="gold" href={`https://tonviewer.com/${JETTON_MASTER}`} target="_blank" rel="noreferrer">{JETTON_MASTER}</a></p>
    <a className="pill" href="/">← BYTCOIN</a>
  </main>;
}
