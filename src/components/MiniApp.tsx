"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import WebApp from "@twa-dev/sdk";
import { useTonConnectUI, useTonWallet } from "@tonconnect/ui-react";
import {
  JETTON_MASTER,
  NAV,
  SWAP_ENABLED,
  TOKEN,
  fromNano,
  toNano
} from "@/lib/config";
import { T, translateError, type Lang } from "@/lib/i18n";

type Task = {
  id: string;
  title: string;
  description: string | null;
  reward_nano: string;
  target_url: string | null;
  task_type: string;
  claim_status: string | null;
};

type Withdrawal = {
  id: string;
  amount_nano: string;
  fee_nano: string;
  net_nano: string;
  status: string;
  tx_hash: string | null;
  created_at: string;
};

type Profile = {
  telegram_id: string;
  first_name: string;
  balance_nano: string;
  connected_wallet: string | null;
  wallet_verified: boolean;
  mining_rate_nano: string;
  withdraw_fee_bps: number;
  pool_remaining_nano: string;
  referral_count: number;
  referral_earned_nano: string;
  session: {
    id: string;
    started_at: string;
    ends_at: string;
    status: string;
    reward_rate_nano_per_hour: string | number;
  } | null;
  withdrawals: Withdrawal[];
};

type Quote = {
  side: "buy" | "sell";
  total: bigint;
  fee: bigint;
  swapAmount: bigint;
  askUnits: bigint;
  minAskUnits: bigint;
  sim?: unknown;
};

const pad = (n: number) => String(n).padStart(2, "0");

const timeLeft = (s: number) =>
  `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;

const short = (a: string) => a.slice(0, 7) + "…" + a.slice(-5);

const STATUS: Record<Lang, Record<string, string>> = {
  id: {
    pending: "Menunggu",
    approved: "Disetujui",
    rejected: "Ditolak",
    paid: "Dibayar"
  },
  en: {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    paid: "Paid"
  }
};

export function MiniApp() {
  const [lang, setLang] = useState<Lang>("id");
  const [tab, setTab] = useState("home");
  const [initData, setInitData] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);
  const [amount, setAmount] = useState("");
  const [minDone, setMinDone] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [onboard, setOnboard] = useState<number | null>(null);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [swapAmt, setSwapAmt] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [isAdminUser, setIsAdminUser] = useState(false);

  const [tonUI] = useTonConnectUI();
  const wallet = useTonWallet();

  const t = T[lang];
  const langRef = useRef<Lang>("id");
  langRef.current = lang;

  const verifying = useRef(false);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      "x-telegram-init-data": initData
    }),
    [initData]
  );

  const notify = (text: string, ok = false) =>
    setNote(text ? { text, ok } : null);

  const err = (e: unknown, fallback: string) =>
    translateError(
      e instanceof Error ? e.message : fallback,
      langRef.current
    );

  useEffect(() => {
    try {
      WebApp.ready();
      WebApp.expand();
    } catch {}

    setInitData(WebApp.initData || "");

    let selectedLang: Lang | null = null;

    try {
      const savedLang = localStorage.getItem("BYT_lang");

      if (savedLang === "id" || savedLang === "en") {
        selectedLang = savedLang;
      }
    } catch {}

    if (!selectedLang) {
      const code = (
        WebApp.initDataUnsafe?.user?.language_code || ""
      ).toLowerCase();

      selectedLang = code.startsWith("id") ? "id" : code ? "en" : "id";
    }

    setLang(selectedLang);

    try {
      if (!localStorage.getItem("BYT_onboarded")) {
        setOnboard(0);
      }
    } catch {}

    const timeoutId = setTimeout(() => setMinDone(true), 1200);
    const intervalId = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = lang;
    } catch {}
  }, [lang]);

  const switchLang = () => {
    const nextLang: Lang = lang === "id" ? "en" : "id";

    setLang(nextLang);

    try {
      localStorage.setItem("BYT_lang", nextLang);
    } catch {}
  };

  const finishOnboard = () => {
    try {
      localStorage.setItem("BYT_onboarded", "1");
    } catch {}

    setOnboard(null);
  };

  const load = useCallback(async () => {
    if (!initData) return;

    try {
      const response = await fetch("/api/session", {
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load account");
      }

      setProfile(data.data);
      setLoadFailed(false);

      const taskResponse = await fetch("/api/tasks", {
        headers
      });

      const taskData = await taskResponse.json();

      if (taskResponse.ok) {
        setTasks(taskData.tasks || []);
      }
    } catch (e) {
      setLoadFailed(true);

      notify(
        translateError(
          e instanceof Error ? e.message : "Unable to load account",
          langRef.current
        )
      );
    }
  }, [initData, headers]);

  const session = profile?.session || null;

  const remaining = session
    ? Math.max(
        0,
        Math.ceil(
          (new Date(session.ends_at).getTime() - now) / 1000
        )
      )
    : 0;

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    (async () => {
      try {
        await tonUI.connectionRestored;
      } catch {}
    })();
  }, [tonUI]);

  useEffect(() => {
    if (!session) return;

    const intervalId = setInterval(() => {
      load();
    }, 3000);

    return () => clearInterval(intervalId);
  }, [session?.id, load]);

  useEffect(() => {
    if (!initData) return;

    fetch("/api/admin/tasks", {
      headers
    })
      .then(response => setIsAdminUser(response.ok))
      .catch(() => setIsAdminUser(false));
  }, [initData, headers]);

  const refreshPayload = useCallback(async () => {
    try {
      tonUI.setConnectRequestParameters({
        state: "loading"
      });

      const response = await fetch("/api/ton-proof/payload", {
        headers
      });

      const data = await response.json();

      if (data.payload) {
        tonUI.setConnectRequestParameters({
          state: "ready",
          value: {
            tonProof: data.payload
          }
        });
      } else {
        tonUI.setConnectRequestParameters(null);
      }
    } catch {
      tonUI.setConnectRequestParameters(null);
    }
  }, [tonUI, headers]);

  useEffect(() => {
    if (!initData) return;

    refreshPayload();

    const unsubscribe = tonUI.onStatusChange(async connectedWallet => {
      const item = connectedWallet?.connectItems?.tonProof;

      if (
        !connectedWallet ||
        !item ||
        !("proof" in item) ||
        verifying.current
      ) {
        return;
      }

      verifying.current = true;

      try {
        const response = await fetch("/api/ton-proof/verify", {
          method: "POST",
          headers,
          body: JSON.stringify({
            address: connectedWallet.account.address,
            public_key: connectedWallet.account.publicKey,
            proof: {
              ...item.proof,
              state_init: connectedWallet.account.walletStateInit
            }
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Wallet verification failed");
        }

        notify(T[langRef.current].walletVerified, true);

        await load();
      } catch (e) {
        notify(err(e, "Wallet verification failed"));
      } finally {
        verifying.current = false;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [initData, headers, tonUI, load, refreshPayload]);

  async function connectWallet() {
    await refreshPayload();
    tonUI.openModal();
  }

  async function reconnectWallet() {
    try {
      await tonUI.disconnect();
    } catch {}

    await connectWallet();
  }

  async function action(url: string, body?: unknown) {
    setBusy(true);
    notify("");

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body || {})
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      notify(t.success, true);

      await load();

      return data;
    } catch (e) {
      notify(err(e, "Request failed"));
    } finally {
      setBusy(false);
    }
  }

  function openUrl(url: string) {
    try {
      if (/^https:\/\/t\.me\//i.test(url)) {
        WebApp.openTelegramLink(url);
      } else if (/^https?:\/\//i.test(url)) {
        WebApp.openLink(url);
      }
    } catch {}
  }

  async function claimTask(task: Task) {
    if (task.target_url && !opened[task.id]) {
      openUrl(task.target_url);

      setOpened(previous => ({
        ...previous,
        [task.id]: true
      }));

      if (task.task_type === "telegram_join") {
        return;
      }
    }

    await action("/api/tasks/claim", {
      taskId: task.id
    });
  }

  async function copyRef() {
    try {
      await navigator.clipboard.writeText(refLink);
      notify(t.copied, true);
    } catch {
      notify(refLink);
    }
  }

  function shareRef() {
    openUrl(
      `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent(t.shareText)}`
    );
  }

  const connected = wallet?.account.address?.toLowerCase();
  const bound = profile?.connected_wallet?.toLowerCase();

  const walletReady = Boolean(
    profile?.wallet_verified &&
    connected &&
    bound === connected
  );

  const needsVerify = Boolean(connected && !walletReady);

  const bot = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

  const refLink =
    profile && bot
      ? `https://t.me/${bot}?startapp=ref_${profile.telegram_id}`
      : "";

  const feeBps =
    profile?.withdraw_fee_bps ?? TOKEN.withdrawFeeBps;

  const rateText = session
    ? fromNano(String(session.reward_rate_nano_per_hour))
    : profile
      ? fromNano(profile.mining_rate_nano)
      : "—";

  let wdAmt: bigint | null = null;

  try {
    wdAmt = amount ? toNano(amount) : null;
  } catch {}

  const wdFee =
    wdAmt !== null
      ? (wdAmt * BigInt(feeBps)) / 10000n
      : 0n;

  const wdOk =
    wdAmt !== null &&
    wdAmt >= TOKEN.minWithdrawalNano;

  async function withdraw() {
    if (wdAmt === null) {
      notify(translateError("Invalid amount", lang));
      return;
    }

    const data = await action("/api/withdrawals", {
      amountNano: wdAmt.toString()
    });

    if (data) {
      setAmount("");
    }
  }

  let swapTotal: bigint | null = null;

  try {
    swapTotal = swapAmt ? toNano(swapAmt) : null;
  } catch {}

  async function getQuote() {
    if (swapTotal === null || swapTotal <= 0n) {
      return;
    }

    setBusy(true);
    setQuote(null);
    notify("");

    try {
      const swapModule = await import("@/lib/swap");
      setQuote(await swapModule.quoteSwap(side, swapTotal));
    } catch {
      notify(t.swapFail);
    } finally {
      setBusy(false);
    }
  }

  async function confirmSwap() {
    if (!quote || !walletReady || !wallet) {
      return;
    }

    setBusy(true);
    notify("");

    try {
      let jettonWallet: string | null = null;

      if (side === "sell") {
        const response = await fetch("/api/swap/jetton-wallet", {
          headers
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Unable to get jetton wallet");
        }

        if (BigInt(data.balance) < quote.total) {
          throw new Error("Insufficient BYT in wallet");
        }

        jettonWallet = data.walletAddress;
      }

      const swapModule = await import("@/lib/swap");

      await swapModule.executeSwap({
        quote,
        userAddress: wallet.account.address,
        jettonWallet,
        tonUI
      });

      notify(t.sent, true);
      setQuote(null);
    } catch (e) {
      notify(err(e, t.swapFail));
    } finally {
      setBusy(false);
    }
  }

  const splash =
    !minDone ||
    (Boolean(initData) && !profile && !loadFailed);

  if (splash) {
    return (
      <div className="splash">
        <div>
          <div className="coin">B</div>
          <div className="logoText">BYTCOIN</div>
          <div className="bar">
            <i />
          </div>
        </div>
      </div>
    );
  }

  if (!initData) {
    return (
      <main className="app">
        <div className="card">
          <div className="logoText">BYTCOIN</div>
          <p className="sub" style={{ textAlign: "center" }}>
            {t.openTg}
          </p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="app">
        <div className="card">
          <p className="sub error" style={{ textAlign: "center" }}>
            {note?.text || t.loadingAcc}
          </p>

          <button
            className="secondary"
            onClick={() => {
              setLoadFailed(false);
              notify("");
              load();
            }}
          >
            {lang === "id" ? "Coba lagi" : "Retry"}
          </button>
        </div>
      </main>
    );
  }

  const miningButton = session ? (
    <button
      className="primary"
      disabled={busy || remaining > 0}
      onClick={() => action("/api/mining/claim")}
    >
      {remaining > 0 ? t.mining_btn : t.claim}
    </button>
  ) : (
    <button
      className="primary"
      disabled={busy || !walletReady}
      onClick={() => action("/api/mining/start")}
    >
      {t.start}
    </button>
  );

  const walletHint = !walletReady ? (
    <p className="sub" style={{ textAlign: "center" }}>
      {t.connectFirst}
    </p>
  ) : null;

  const pills = (
    <div
      style={{
        marginTop: 8,
        display: "flex",
        gap: 6,
        justifyContent: "center",
        flexWrap: "wrap"
      }}
    >
      <span className="pill">⛏️ {TOKEN.symbol}</span>
      <span className="pill">
        ⚡ {rateText} BYT{t.perHour}
      </span>
    </div>
  );

  const home = (
    <>
      <div className="card">
        <div className="label">{t.balance}</div>
        <div className="balance gold">
          {fromNano(profile.balance_nano)} <small>BYT</small>
        </div>
        <div className="sub">{t.balanceSub}</div>
      </div>

      <div className="grid2">
        <div className="stat">
          <div className="label">{t.wallet}</div>
          <b>
            {walletReady && connected
              ? short(connected)
              : connected
                ? t.verifying
                : t.notConnected}
          </b>
        </div>

        <div className="stat">
          <div className="label">{t.rate}</div>
          <b>
            {fromNano(profile.mining_rate_nano)}
            {t.perHour}
          </b>
        </div>
      </div>

      <div className="sectionTitle">{t.mining}</div>

      <div className="card">
        <div className="row">
          <span className="label">{t.session}</span>
          <span className="pill">
            {session
              ? remaining > 0
                ? t.active
                : t.ready
              : t.idle}
          </span>
        </div>

        <div className="timer">
          {session ? timeLeft(remaining) : "01:00:00"}
        </div>

        {pills}

        <div
          className="sub"
          style={{ textAlign: "center", marginTop: 8 }}
        >
          {t.miningNote}
        </div>

        <div style={{ marginTop: 16 }}>
          {miningButton}
        </div>

        {walletHint}
      </div>

      <div className="notice">{t.supplyNote}</div>

      <p style={{ textAlign: "center" }}>
        <a className="pill" href="/whitepaper">
          {t.whitepaper}
        </a>
      </p>
    </>
  );

  const mining = (
    <>
      <div className="sectionTitle">{t.mining}</div>

      <div className="card">
        <div className="label">{t.cycle}</div>

        <div className="timer">
          {session ? timeLeft(remaining) : "01:00:00"}
        </div>

        {pills}

        <p
          className="sub"
          style={{ textAlign: "center", marginTop: 8 }}
        >
          {t.rate}: {fromNano(profile.mining_rate_nano)}
          BYT{t.perHour} · {t.poolLeft}:{" "}
          {fromNano(profile.pool_remaining_nano)} BYT
        </p>

        {miningButton}
        {walletHint}
      </div>

      <div className="notice">{t.miningNote}</div>
    </>
  );

  const tasksView = (
    <>
      <div className="sectionTitle">{t.tasks}</div>

      <div className="card">
        {tasks.length ? (
          tasks.map(task => {
            const status = task.claim_status;

            const label =
              task.task_type === "telegram_join" && !opened[task.id]
                ? t.joinClaim
                : t.claimBtn;

            return (
              <div className="task" key={task.id}>
                <div className="taskIcon">✦</div>

                <div style={{ flex: 1 }}>
                  <b>{task.title}</b>

                  {task.description ? (
                    <div className="sub">{task.description}</div>
                  ) : null}

                  <small className="gold">
                    +{fromNano(task.reward_nano)} BYT
                  </small>
                </div>

                {status === "paid" || status === "approved" ? (
                  <span className="pill success">{t.done}</span>
                ) : status === "pending" ? (
                  <span className="pill">{t.review}</span>
                ) : status === "rejected" ? (
                  <span className="pill error">{t.rejected}</span>
                ) : (
                  <button
                    className="secondary"
                    style={{ width: "auto" }}
                    disabled={busy}
                    onClick={() => claimTask(task)}
                  >
                    {label}
                  </button>
                )}
              </div>
            );
          })
        ) : (
          <p className="sub">{t.noTasks}</p>
        )}
      </div>

      <div className="notice">{t.tasksNote}</div>
    </>
  );

  const referral = (
    <>
      <div className="sectionTitle">{t.invite}</div>

      <div className="card">
        <p className="sub">{t.inviteText}</p>

        <div className="grid2" style={{ marginTop: 12 }}>
          <div className="stat">
            <div className="label">{t.friends}</div>
            <b>{profile.referral_count}</b>
          </div>

          <div className="stat">
            <div className="label">{t.earned}</div>
            <b>{fromNano(profile.referral_earned_nano)}</b>
          </div>
        </div>

        {refLink ? (
          <>
            <input
              readOnly
              value={refLink}
              onFocus={event => event.currentTarget.select()}
              style={{ marginTop: 14 }}
            />

            <div className="grid2">
              <button className="secondary" onClick={copyRef}>
                {t.copy}
              </button>

              <button className="primary" onClick={shareRef}>
                {t.share}
              </button>
            </div>
          </>
        ) : (
          <p className="sub" style={{ marginTop: 12 }}>
            {t.setBot}
          </p>
        )}
      </div>
    </>
  );

  const swapView = (
    <>
      <div className="sectionTitle">{t.swap}</div>

      {!SWAP_ENABLED ? (
        <div className="card">
          <p className="sub">{t.swapSoon}</p>
        </div>
      ) : (
        <div className="card">
          <div className="seg">
            <button
              className={side === "buy" ? "on" : ""}
              onClick={() => {
                setSide("buy");
                setQuote(null);
              }}
            >
              {t.buy}
            </button>

            <button
              className={side ===   "sell" ? "on" : ""}
              onClick={() => {
                setSide("sell");
                setQuote(null);
              }}
            >
              {t.sell}
            </button>
          </div>

          <div className="label">
            {side === "buy" ? t.youPayTon : t.youSellBYT}
          </div>

          <input
            inputMode="decimal"
            placeholder="0.0"
            value={swapAmt}
            onChange={event => {
              setSwapAmt(event.target.value);
              setQuote(null);
            }}
          />

          <button
            className="secondary"
            disabled={
              busy ||
              swapTotal === null ||
              swapTotal <= 0n ||
              !walletReady
            }
            onClick={getQuote}
                    >
            {t.getQuote}
          </button>

          {!walletReady ? (
            <p className="sub">{t.connectFirst}</p>
          ) : null}

          {quote ? (
            <div style={{ marginTop: 14 }}>
              <div className="row sub">
                <span>{t.fee}</span>
                <b>
                  {fromNano(quote.fee)}{" "}
                  {side === "buy" ? "TON" : "BYT"}
                </b>
              </div>

              <div className="row sub">
                <span>{t.swapped}</span>
                <b>
                  {fromNano(quote.swapAmount)}{" "}
                  {side === "buy" ? "TON" : "BYT"}
                </b>
              </div>

              <div className="row sub">
                <span>{t.estReceive}</span>
                <b>
                  {fromNano(quote.askUnits)}{" "}
                  {side === "buy" ? "BYT" : "TON"}
                </b>
              </div>

              <div className="row sub">
                <span>{t.minReceive}</span>
                <b>
                  {fromNano(quote.minAskUnits)}{" "}
                  {side === "buy" ? "BYT" : "TON"}
                </b>
              </div>

              <div style={{ marginTop: 12 }}>
                <button
                  className="primary"
                  disabled={busy || !
walletReady}
                  onClick={confirmSwap}
                 >
                  {t.confirmSwap}
                </button>
              </div>
            </div>
          ) : null}

          <p className="sub" style={{ marginTop: 12 }}>
            {t.swapNote}
          </p>
        </div>
      )}
    </>
  );

  const walletView = (
    <>
      <div className="sectionTitle">{t.tonWallet}</div>

      <div className="card">
        <p className="sub">{t.walletInfo}</p>

        {connected ? (
          <div className="stat"
style={{ margin: "12px 0" }}>
            <div className="label">{t.wallet}</div>

            <b style={{ wordBreak: "break-all", fontSize: 13 }}>
              {short(connected)}{" "}
              {walletReady ? (
                <span className="success">{t.verified}</span>
              ) : null}
            </b>
          </div>
        ) : null}

        {needsVerify ? (
          <>
            <p className="sub error">{t.notVerified}</p>

            <button
              className="primary"
              disabled={busy}
              onClick={reconnectWallet}
            >
              {t.reconnect}
            </button>
          </>
        ) : connected ? (
          <button
            className="secondary"
            onClick={() =>  tonUI.openModal()}
          >
            {t.manage}
          </button>
        ) : (
          <button
            className="primary"
            onClick={connectWallet}
          >
            {t.connect}
          </button>
        )}

        <p
          className="sub"
          style={{ marginTop: 12, wordBreak: "break-all" }}
        >
          {t.master}:{" "}
          <a
            className="gold"
            href={`https://tonviewer.com/${JETTON_MASTER}`}
            target="_blank"
            rel="noreferrer"
          >
            {short(JETTON_MASTER)}
          </a>
        </p>
      </div>

      <div className="sectionTitle">{t.withdraw}</div>

      <div className="card">
        <div className="pill" style={{ display: "inline-block" }}>
          {t.minWd}
        </div>

        <p className="sub" style={{ marginTop: 10 }}>
          {t.wdInfo}
        </p>

        <input
          inputMode="decimal"
          placeholder={t.amountPh}
          value={amount}
          onChange={event => setAmount(event.target.value)}
        />

        {wdAmt !== null && wdOk ? (
          <div style={{ marginBottom: 12 }}>
            <div className="row sub">
              <span>{t.wdFee}</span>
              <b>{fromNano(wdFee.toString())} BYT</b>
 </div>

            <div className="row sub">
              <span>{t.wdPreview}</span>
              <b className="gold">
                {fromNano((wdAmt - wdFee).toString())} BYT
              </b>
            </div>
          </div>
        ) : null}

        <button
          className="primary"
          disabled={busy || !walletReady || !wdOk}
          onClick={withdraw}
        >
          {t.wdBtn}
        </button>

        {!walletReady ? (
          <p className="sub" style={{ textAlign: "center" }}>
            {t.err_wallet}
          </p>
        ) : null}
      </div>

      {profile.withdrawals?.length ?(
        <>
          <div className="sectionTitle">{t.recentWd}</div>

          <div className="card">
            {profile.withdrawals.map(withdrawal => (
              <div className="task" key={withdrawal.id}>
                <div style={{ flex: 1 }}>
                  <b>
                    {fromNano(withdrawal.amount_nano)} BYT
                  </b>

                  <div className="sub">
                    {t.wdPreview}:{" "}
                    {fromNano(withdrawal.net_nano)} ·{" "}
                    {new Date(
                      withdrawal.created_at
                    ).toLocaleDateString(
                      lang === "id" ? "id-ID" : "en-US"
                    )}
                  </div>

                  {withdrawal.tx_hash ? (
                    <small
                      className="gold"
                      style={{ wordBreak: "break-all" }}
                    >
                      {withdrawal.tx_hash}
                    </small>
                  ) : null}
                </div>

                <span className="pill">
                  {STATUS[lang][withdrawal.status] ||
                    withdrawal.status}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </>
  );

  const views: Record<string, React.ReactNode> = {
    home,
    mining,
    tasks: tasksView,
    referral,
    swap: swapView,
    wallet: walletView
  };

  const onboardSteps = [
    [t.ob1t, t.ob1],
    [t.ob2t, t.ob2],
    [t.ob3t, t.ob3]
  ];

  return (
    <>
      {onboard !== null ? (
        <div className="splash">
          <div style={{ maxWidth: 360, padding: 24 }}>
            <div className="coin">B</div>

            <h2 className="gold">
              {onboardSteps[onboard][0]}
            </h2>

            <p className="sub">
              {onboardSteps[onboard][1]}
            </p>

            <div className="dots">
              {onboardSteps.map((_, index) => (
                <i
                  key={index}
                  className={index === onboard ? "on" : ""}
                />
              ))}
            </div>

            <button
              className="primary"
              onClick={() =>
                onboard >= onboardSteps.length - 1
                  ? finishOnboard()
                  : setOnboard(onboard + 1)
              }
            >
              {onboard >= onboardSteps.length - 1
                ? t.begin
                : t.next}
            </button>

            <p>
              <button className="lang" onClick={finishOnboard}>
                {t.skip}
              </button>
            </p>
          </div>
        </div>
      ) : null}

      <main className="app">
        <header className="top">
          <div className="brand">
            <div className="coin">B</div>

            <div>
              <strong>BYTCOIN</strong>
              <small>$BYT</small>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center"
            }}
          >
            {isAdminUser ? (
              <a className="pill" href="/admin">
                Admin
              </a>
            ) : null}

            <button className="lang" onClick={switchLang}>
              {lang === "id" ? "EN" : "ID"}
            </button>
          </div>
        </header>

        {note ? (
          <div
            className={`notice ${note.ok ? "success" : "error"}`}
            onClick={() => notify("")}
          >
            {note.text}
          </div>
        ) : null}

        {views[tab]}
        </main>

      <nav className="nav">
        {NAV.map(item => (
          <button
            key={item.id}
            className={tab === item.id ? "active" : ""}
            onClick={() => {
              setTab(item.id);
              notify("");
            }}
          >
            <span>{item.icon}</span>
            {T[lang][`nav_${item.id}`] || item.label}
          </button>
        ))}
      </nav>
    </>
  );
}