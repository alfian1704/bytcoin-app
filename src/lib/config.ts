// ---- Token (jetton master already deployed & minting revoked) ----
export const JETTON_MASTER =
  process.env.NEXT_PUBLIC_BYT_JETTON_MASTER ||
  "EQA6Jr9Lp2oSryYX89zX8heE9rM7_35p69uDD9RrSaEP-1Dx";

const NANO = 1_000_000_000n;
export const TOKEN = {
  name: "BYTCOIN",
  symbol: "BYT",
  decimals: 9,
  maxSupply: 21_000_000n * NANO,            // 21,000,000 BYT (matches on-chain max supply)
  minWithdrawalNano: 21n * NANO,            // 21 BYT
  withdrawalHoldingBps: 2100,               // wallet must hold 21% of the withdrawal amount
  referralBonusNano: 2_100_000_000n,        // 2.1 BYT (display only; DB setting is authoritative)
  referralMiningBps: 2100,                  // +21% of a friend's mining reward (display only)
  withdrawFeeBps: 1000,                     // 10% (display only; DB setting is authoritative)
  buyFeeBps: 100,                           // 1% on buy (TON input)  -> fee wallet
  sellFeeBps: 200                           // 2% on sell (BYT input) -> fee wallet
};
export const MINING_PER_DAY_NANO = 2_100_000_000n; // 2.1 BYT/day (hourly sessions: 0.0875 BYT/hour)
export const ALLOCATION = [
  { key: "miner", amount: 10_500_000, pct: 50 },
  { key: "team", amount: 2_100_000, pct: 10 },
  { key: "treasury", amount: 2_100_000, pct: 10 },
  { key: "liquidity", amount: 6_300_000, pct: 30 }
] as const;
export const FEE_WALLET = process.env.NEXT_PUBLIC_FEE_WALLET || "UQAEwi62JRfJ0hA5e_W7esUqkDTYNqWYrUreHuIIkgxZYZF7";
export const SWAP_ENABLED = process.env.NEXT_PUBLIC_SWAP_ENABLED === "true";

export const NAV = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "mining", label: "Mining", icon: "⛏" },
  { id: "tasks", label: "Tasks", icon: "☷" },
  { id: "referral", label: "Invite", icon: "♧" },
  { id: "swap", label: "Swap", icon: "⇄" },
  { id: "wallet", label: "Wallet", icon: "◇" }
] as const;

// ---- nanoBYT helpers (string/BigInt only, never floats) ----
export function fromNano(v: string | number | bigint | null | undefined): string {
  if (v === null || v === undefined || v === "") return "0";
  let n: bigint;
  try { n = typeof v === "number" ? BigInt(Math.trunc(v)) : BigInt(v); } catch { return "0"; }
  const neg = n < 0n; if (neg) n = -n;
  const whole = n / NANO, frac = (n % NANO).toString().padStart(9, "0").replace(/0+$/, "");
  const w = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + w + (frac ? "." + frac : "");
}
export function toNano(input: string): bigint {
  const s = String(input).trim().replace(",", ".");
  if (!/^\d+(\.\d{1,9})?$/.test(s)) throw new Error("Invalid amount (max 9 decimals).");
  const [w, f = ""] = s.split(".");
  return BigInt(w) * NANO + BigInt(f.padEnd(9, "0"));
}
