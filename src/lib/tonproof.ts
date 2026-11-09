import { createHash, createHmac, createPublicKey, randomBytes, timingSafeEqual, verify } from "node:crypto";

export const PROOF_TTL_SECONDS = 15 * 60;

function secret() {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  return createHmac("sha256", "ton-proof-payload").update(t).digest();
}
const mac = (body: string) => createHmac("sha256", secret()).update(body).digest("hex").slice(0, 32);

export function makePayload(): string {
  const body = `${Math.floor(Date.now() / 1000)}.${randomBytes(8).toString("hex")}`;
  return `${body}.${mac(body)}`;
}
export function checkPayload(payload: string, now = Math.floor(Date.now() / 1000)): boolean {
  const m = /^(\d{10})\.([0-9a-f]{16})\.([0-9a-f]{32})$/.exec(payload || "");
  if (!m) return false;
  const a = Buffer.from(m[3]), b = Buffer.from(mac(`${m[1]}.${m[2]}`));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const age = now - Number(m[1]);
  return age >= -60 && age <= PROOF_TTL_SECONDS;
}

// FIX: Support both RAW (0:hex) and FRIENDLY (EQ/UQ) TON addresses
export function parseRawAddress(addr: string): { workchain: number; hash: Buffer } {
  const rawMatch = /^(-?\d+):([0-9a-fA-F]{64})$/.exec(addr || "");
  if (rawMatch) {
    return { workchain: Number(rawMatch[1]), hash: Buffer.from(rawMatch[2], "hex") };
  }
  // Try friendly base64 (EQ, UQ, Ef, etc) - 36 bytes
  try {
    const clean = addr.trim();
    const buf = Buffer.from(clean, "base64");
    if (buf.length === 36) {
      const workchain = buf[1] === 0xff ? -1 : buf[1];
      const hash = buf.subarray(2, 34);
      return { workchain, hash };
    }
  } catch {}
  throw new Error("Invalid wallet address format.");
}

export const normalizeAddress = (addr: string) => { 
  const a = parseRawAddress(addr); 
  return `${a.workchain}:${a.hash.toString("hex").toLowerCase()}`; 
};

export type ProofInput = {
  address: string;
  proof: { timestamp: number; domain: { lengthBytes: number; value: string }; payload: string; signature: string };
};

export function verifyProofSignature(input: ProofInput, publicKeyHex: string): boolean {
  const { workchain, hash } = parseRawAddress(input.address);
  const { timestamp, domain, payload, signature } = input.proof;
  const domainBytes = Buffer.from(domain.value, "utf8");
  if (domain.lengthBytes !== domainBytes.length) return false;
  const wc = Buffer.alloc(4); wc.writeInt32BE(workchain);
  const ts = Buffer.alloc(8); ts.writeBigUInt64LE(BigInt(timestamp));
  const dl = Buffer.alloc(4); dl.writeUInt32LE(domainBytes.length);
  const msg = Buffer.concat([Buffer.from("ton-proof-item-v2/"), wc, hash, dl, domainBytes, ts, Buffer.from(payload)]);
  const full = Buffer.concat([Buffer.from([0xff, 0xff]), Buffer.from("ton-connect"), createHash("sha256").update(msg).digest()]);
  const digest = createHash("sha256").update(full).digest();
  const pub = Buffer.from(publicKeyHex, "hex");
  if (pub.length !== 32) return false;
  const key = createPublicKey({ key: Buffer.concat([Buffer.from("302a300506032b6570032100", "hex"), pub]), format: "der", type: "spki" });
  return verify(null, digest, key, Buffer.from(signature, "base64"));
}