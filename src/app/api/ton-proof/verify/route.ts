import { NextResponse } from "next/server";
import { errMsg, getTelegramUser, supabaseAdmin } from "@/lib/server";
import { getWalletPublicKey } from "@/lib/tonapi";
import { checkPayload, normalizeAddress, PROOF_TTL_SECONDS, verifyProofSignature, type ProofInput } from "@/lib/tonproof";

export async function POST(req: Request) {
  try {
    const user = await getTelegramUser();
    const body = await req.json();
    const input = { address: String(body.address || ""), proof: body.proof } as ProofInput;
    const clientKey = String(body.public_key || "").toLowerCase();
    const p = input.proof;
    if (!p || typeof p.signature !== "string" || typeof p.payload !== "string" || !p.domain || typeof p.timestamp !== "number")
      throw new Error("Invalid TON Proof.");

    const appHost = new URL(process.env.NEXT_PUBLIC_APP_URL || "").host;
    if (!appHost || p.domain.value !== appHost) throw new Error("TON Proof domain mismatch.");
    if (!checkPayload(p.payload)) throw new Error("TON Proof challenge expired. Reconnect your wallet.");
    if (Math.abs(Math.floor(Date.now() / 1000) - p.timestamp) > PROOF_TTL_SECONDS + 60) throw new Error("TON Proof is too old. Reconnect your wallet.");

    const address = normalizeAddress(input.address);
    const onchainKey = await getWalletPublicKey(address);
    if (!onchainKey) throw new Error("Wallet is not active on TON yet (no public key on-chain). Make one transaction with it first, then reconnect.");
    if (clientKey && clientKey !== onchainKey) throw new Error("Wallet public key mismatch.");
    if (!verifyProofSignature({ address, proof: p }, onchainKey)) throw new Error("Invalid wallet signature.");

    const db = supabaseAdmin();
    const { data, error } = await db.rpc("bind_wallet", { p_tid: String(user.id), p_wallet: address });
    if (error) throw error;
    return NextResponse.json({ ok: true, wallet: data?.wallet });
  } catch (e) { return NextResponse.json({ error: errMsg(e, "Wallet verification failed") }, { status: 400 }); }
}
