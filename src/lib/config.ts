export const TOKEN = {
  name: "BYT",
  symbol: "BYT",
  decimals: 8,
};

export const NANO = 10n ** 8n; // 1e8 - SEBELUMNYA 1e8

export const JETTON_MASTER = process.env.NEXT_PUBLIC_JETTON_MASTER!; // JANGAN PAKAI FALLBACK HARDCODE
export const FEE_WALLET = process.env.NEXT_PUBLIC_FEE_WALLET || "";
export const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET || "";

export const MAX_SUPPLY = 21000000000n * NANO; // 21B BYT - ganti sesuai skema baru lo
export const MIN_WITHDRAWAL = 2100n * NANO; // 2100 BYT
export const MAX_WITHDRAWAL = 210000n * NANO; // 210000 BYT

export const WITHDRAW_FEE_BPS = 300; // 3%
export const HOLDING_BPS = 2100; // 21%
export const BUY_FEE_BPS = 100; // 1%
export const SELL_FEE_BPS = 200; // 2%

export const DAILY_RATE = 210000000000n; // 2.1 BYT / hari dalam nano 8 desimal = 2.1 * 1e8

export function fromNano(v: bigint): string {
  const s = v.toString().padStart(9, "0"); // minimal 9 char biar ada 8 desimal
  if (s.length <= 8) return `0.${s.padStart(8, "0")}`;
  const intPart = s.slice(0, -8);
  const decPart = s.slice(-8).replace(/0+$/, "");
  return decPart ? `${intPart}.${decPart}` : intPart;
}

export function toNano(str: string): bigint {
  const [intP, decP = ""] = str.split(".");
  const dec = (decP + "00000000").slice(0, 8); // SEBELUMNYA 9, SEKARANG 8
  return BigInt(intP || "0") * NANO + BigInt(dec);
}