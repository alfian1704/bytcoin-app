"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import { FEE_WALLET, JETTON_MASTER, NAV, SWAP_ENABLED, TOKEN, fromNano, toNano } from "@/lib/config";
import { T, translateError, type Lang } from "@/lib/i18n";

type Task = { id: string; title: string; description: string | null; reward_nano: string; target_url: string | null; task_type: string; claim_status: string | null };
type Withdrawal = { id: string; amount_nano: string; fee_nano: string; net_nano: string; status: string; tx_hash: string | null; created_at: string };
type Profile = {
  telegram_id: string; first_name: string; balance_nano: string; connected_wallet: string | null; wallet_verified: boolean;
  mining_rate_nano: string; withdraw_fee_bps: number; pool_remaining_nano: string; referral_count: number; referral_earned_nano: string;
  session: { id: string; started_at: string; ends_at: string; status: string; reward_rate_nano_per_hour: string } | null;
  withdrawals: Withdrawal[];
};
type Quote = { side: "buy" | "sell"; total: bigint; fee: bigint; swapAmount: bigint; askUnits: bigint; minAskUnits: bigint };

const timeLeft = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const short = (a: string) => a.slice(0, 7) + "…" + a.slice(-5);

export function MiniApp() {
  const [lang, setLang] = useState<Lang>("id");
  const [tab, setTab] = useState("home"), [initData, setInitData] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null), [tasks, setTasks] = useState<Task[]>([]);
  const [now, setNow] = useState(Date.now()), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [amount, setAmount] = useState("");
  const [minDone, setMinDone] = useState(false), [loadFailed, setLoadFailed] = useState(false);
  const [onboard, setOnboard] = useState<number | null>(null);
  const [side, setSide] = useState<"buy" | "sell">("buy"), [swapAmt, setSwapAmt] = useState(""), [quote, setQuote] = useState<Quote | null>(null);
  const [tonUI] = useTonConnectUI(), wallet = useTonWallet();
  const t = T[lang];
  const headers = useMemo(() => ({ "Content-Type": "application/json", "x-telegram-init-data": initData }), [initData]);
  const err = (e: unknown, fb: string) => translateError(e instanceof Error ? e.message : fb, lang);

  useEffect(() => {
    try { WebApp.ready(); WebApp.expand(); } catch {}
    setInitData(WebApp.initData || "");
    let l: Lang | null = null;
    try { const s = localStorage.getItem("byc_lang"); if (s === "id" || s === "en") l = s; } catch {}
    if (!l) { const code = (WebApp.initDataUnsafe?.user?.language_code || "").toLowerCase(); l = code.startsWith("id") ? "id" : code ? "en" : "id"; }
    setLang(l);
    try { if (!localStorage.getItem("byc_onboarded")) setOnboard(0); } catch {}
    const tm = setTimeout(() => setMinDone(true), 1200);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearTimeout(tm); clearInterval(id); };
  }, []);
  const switchLang = () => { const n: Lang = lang === "id" ? "en" : "id"; setLang(n); try { localStorage.setItem("byc_lang", n); } catch {} };
  const finishOnboard = () => { try { localStorage.setItem("byc_onboarded", "1"); } catch {} setOnboard(null); };

  const load = useCallback(async () => {
    if (!initData) return;
    try {
      const r = await fetch("/api/session", { headers }); const j = await r.json(); if (!r.ok) throw new Error(j.error);
      setProfile(j.data);
      const tr = await fetch("/api/tasks", { headers }); const tj = await tr.json(); if (tr.ok) setTasks(tj.tasks || []);
    } catch (e) { setLoadFailed(true); setMessage(e instanceof Error ? e.message : "Unable to load account"); }
  }, [initData, headers]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!initData) return;
    let cancelled = false;
    tonUI.setConnectRequestParameters({ state: "loading" });
    fetch("/api/ton-proof/payload", { headers }).then(r => r.json()).then(j => {
      if (cancelled) return;
      if (j.payload) tonUI.setConnectRequestParameters({ state: "ready", value: { tonProof: j.payload } });
      else tonUI.setConnectRequestParameters(null);
    }).catch(() => tonUI.setConnectRequestParameters(null));
    const unsub = tonUI.onStatusChange(async w => {
      const item = w?.connectItems?.tonProof;
      if (!w || !item || !("proof" in item)) return;
      try {
        const r = await fetch("/api/ton-proof/verify", { method: "POST", headers, body: JSON.stringify({ address: w.account.address, public_key: w.account.publicKey, proof: { ...item.proof, state_init: w.account.walletStateInit } }) });
        const j = await r.json(); if (!r.ok) throw new Error(j.error);
        setMessage(T[lang].walletVerified); load();
      } catch (e) { setMessage(e instanceof Error ? e.message : "Wallet verification failed"); tonUI.disconnect(); }
    });
    return () => { cancelled = true; unsub(); };
  }, [initData, headers, tonUI, load]);

  async function action(url: string, body?: unknown) {
    setBusy(true); setMessage("");
    try {
      const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(body || {}) }); const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Request failed");
      setMessage(t.success); await load(); return j;
    } catch (e) { setMessage(err(e, "Request failed")); } finally { setBusy(false); }
  }

  const session = profile?.session || null;
  const remaining = session ? Math.max(0, Math.ceil((new Date(session.ends_at).getTime() - now) / 1000)) : 0;
  const connected = wallet?.account.address?.toLowerCase();
  const bound = profile?.connected_wallet?.toLowerCase();
  const walletReady = Boolean(profile?.wallet_verified && connected && bound === connected);
  const needsVerify = Boolean(connected && !walletReady);
  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  const refLink = profile && bot ? `https://t.me/${bot}?startapp=ref_${profile.telegram_id}` : "";
  const feeBps = profile?.withdraw_fee_bps ?? TOKEN.withdrawFeeBps;

  const MiningButton = () => session
    ? <button className="primary" disabled={busy || remaining > 0} onClick={() => action("/api/mining/claim")}>{remaining > 0 ? t.mining_btn : t.claim}</button>
    : <button className="primary" disabled={busy || !walletReady} onClick={() => action("/api/mining/start")}>{t.start}</button>;
  const WalletHint = () => !walletReady ? <p className="sub" style={{ textAlign: "center" }}>{t.connectFirst}</p> : null;

  let wdAmt: bigint | null = null; try { wdAmt = amount ? toNano(amount) : null; } catch {}
  const wdFee = wdAmt !== null ? (wdAmt * BigInt(feeBps)) / 10000n : 0n;
  async function withdraw() {
    if (wdAmt === null) { setMessage("Invalid amount"); return; }
    const j = await action("/api/withdrawals", { amountNano: wdAmt.toString() }); if (j) setAmount("");
  }
  async function claimTask(tk: Task) {
    if (tk.target_url) WebApp.openLink(tk.target_url);
    await action("/api/tasks/claim", { taskId: tk.id });
  }

  let swapTotal: bigint | null = null; try { swapTotal = swapAmt ? toNano(swapAmt) : null; } catch {}
  async function getQuote() {
    if (swapTotal === null) return;
    setBusy(true); setQuote(null); setMessage("");
    try { const m = await import("@/lib/swap"); setQuote(await m.quoteSwap(side, swapTotal)); }
    catch { setMessage(t.swapFail); } finally { setBusy(false); }
  }
  async function confirmSwap() {
    if (!quote || !walletReady || !wallet) return;
    setBusy(true); setMessage("");
    try {
      let jettonWallet: string | null = null;
      if (side === "sell") {
        const r = await fetch("/api/swap/jetton-wallet", { headers }); const j = await r.json(); if (!r.ok) throw new Error(j.error);
        if (BigInt(j.balance) < quote.total) throw new Error("Insufficient BYC in wallet");
        jettonWallet = j.walletAddress;
      }
      const m = await import("@/lib/swap");
      await m.executeSwap({ quote, userAddress: wallet.account.address, jettonWallet, tonUI });
      setMessage(t.sent); setQuote(null);
    } catch (e) { setMessage(err(e, t.swapFail)); } finally { setBusy(false); }
  }

  const home = <>
    <div className="card"><div className="label">{t.balance}</div><div className="balance gold">{profile ? fromNano(profile.balance_nano) : "0"} <small>BYC</small></div><div className="sub">{t.balanceSub}</div></div>
    <div className="grid2"><div className="stat"><div className="label">{t.wallet}</div><b>{walletReady && connected ? short(connected) : connected ? t.verifying : t.notConnected}</b></div><div className="stat"><div className="label">{t.rate}</div><b>{profile ? fromNano(profile.mining_rate_nano) : "—"}{t.perHour}</b></div></div>
    <div className="sectionTitle">{t.mining}</div>
    <div className="card"><div className="row"><span className="label">{t.session}</span><span className="pill">{session ? (remaining > 0 ? t.active : t.ready) : t.idle}</span></div>
      <div className="timer">{session ? timeLeft(remaining) : "01:00:00"}</div>
      <div style={{ textAlign: "center", marginTop: 8, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
        <span className="pill">⛏️ Mining: {TOKEN.symbol || "BYC"}</span>
        <span className="pill">⚡ Speed: {session ? fromNano(session.reward_rate_nano_per_hour) : profile ? fromNano(profile.mining_rate_nano) : "1"} BYC/h</span>
      </div>
      <div className="sub" style={{ textAlign: "center", marginTop: 8 }}>{t.miningNote}</div>
      <div style={{ marginTop: 16 }}><MiningButton /></div><WalletHint /></div>
    <div className="notice">{t.supplyNote}</div>
    <p style={{ textAlign: "center" }}><a className="pill" href="/whitepaper">{t.whitepaper}</a></p></>;

  const mining = <><div className="sectionTitle">{t.mining}</div><div className="card"><div className="label">{t.cycle}</div><div className="timer">{session ? timeLeft(remaining) : "01:00:00"}</div>
    <div style={{ textAlign: "center", marginTop: 8, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
      <span className="pill">⛏️ Mining: {TOKEN.symbol || "BYC"}</span>
      <span className="pill">⚡ Speed: {session ? fromNano(session.reward_rate_nano_per_hour) : profile ? fromNano(profile.mining_rate_nano) : "1"} BYC/h</span>
    </div>
    <p className="sub" style={{ textAlign: "center", marginTop: 8 }}>{t.rate}: {profile ? fromNano(profile.mining_rate_nano) : "—"} BYC{t.perHour} · {t.poolLeft}: {profile ? fromNano(profile.pool_remaining_nano) : "—"} BYC</p><MiningButton /><WalletHint /></div></>;

  const tasksView = <><div className="sectionTitle">{t.tasks}</div><div className="card">{tasks.length ? tasks.map(tk => <div className="task" key={tk.id}>
    <div className="taskIcon">✦</div><div style={{ flex: 1 }}><b>{tk.title}</b><div className="sub">{tk.description}</div><small className="gold">{fromNano(tk.reward