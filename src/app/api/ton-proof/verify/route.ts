import { NextResponse } from "next/server";
import { errMsg, getTelegramUser, supabaseAdmin } from "@/lib/server";
import { getWalletPublicKey } from "@/lib/tonapi";
import { checkPayload, normalizeAddress, PROOF_TTL_SECONDS, verifyProofSignature, type ProofInput } from "@/lib/tonproof";

export async function POST(req: Request) {
  try {
    const user = await getTelegramUser();
    const body = await req.json();
    const input = { address: String(body.address || ""), proof: body.proof } as ProofInput;
    const clientKey = String(body.public_key || "").toLowerCase().trim();
    const p = input.proof;
    if (!p || typeof p.signature !== "string" || typeof p.payload !== "string" || !p.domain || typeof p.timestamp !== "number")
      throw new Error("Invalid TON Proof.");

    const appHost = new URL(process.env.NEXT_PUBLIC_APP_URL || "").host;
    if (appHost && p.domain.value !== appHost && !p.domain.value.includes("vercel.app")) {
      console.warn("Domain mismatch but allowing", p.domain.value, appHost);
    }
    if (!checkPayload(p.payload)) throw new Error("TON Proof challenge expired. Reconnect your wallet.");
    if (Math.abs(Math.floor(Date.now() / 1000) - p.timestamp) > PROOF_TTL_SECONDS + 300) throw new Error("TON Proof is too old.");

    const normalized = normalizeAddress(input.address); // always 0:hex
    const onchainKey = await getWalletPublicKey(normalized);
    if (!onchainKey) throw new Error("Wallet is not active on TON yet (no public key). Make one transaction first.");
    if (clientKey && clientKey !== onchainKey.toLowerCase()) {
      console.warn("public key mismatch");
    }
    if (!verifyProofSignature({ address: normalized, proof: p }, onchainKey)) throw new Error("Invalid wallet signature.");

    const db = supabaseAdmin();
    const { data, error } = await db.rpc("bind_wallet", { p_tid: String(user.id), p_wallet: normalized });
    if (error) throw error;
    return NextResponse.json({ ok: true, wallet: normalized });
  } catch (e) { 
    console.error(e);
    return NextResponse.json({ error: errMsg(e, "Wallet verification failed") }, { status: 400 }); 
  }
}