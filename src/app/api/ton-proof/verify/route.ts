import { NextResponse } from "next/server";
import { getTelegramUser, safeErr, supabaseAdmin } from "@/lib/server";
import { getWalletPublicKey } from "@/lib/tonapi";
import { checkPayload, normalizeAddress, PROOF_TTL_SECONDS, verifyProofSignature, type ProofInput } from "@/lib/tonproof";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let user;
  try { user = await getTelegramUser(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  try {
    const body = await req.json();
    const input = { address: String(body.address || ""), proof: body.proof } as ProofInput;
    const p = input.proof;
    if (!p || typeof p.signature !== "string" || typeof p.payload !== "string" || !p.domain
        || typeof p.domain.value !== "string" || typeof p.domain.lengthBytes !== "number"
        || !Number.isSafeInteger(p.timestamp))
      throw new Error("Invalid TON Proof.");

    let appHost = "";
    try { appHost = new URL(process.env.NEXT_PUBLIC_APP_URL || "").host; } catch {}
    if (!appHost) throw new Error("Wallet verification is not configured.");
    if (p.domain.value !== appHost) throw new Error("Invalid proof domain.");

    if (!checkPayload(p.payload, String(user.id))) throw new Error("TON Proof challenge expired. Reconnect your wallet.");
    if (Math.abs(Math.floor(Date.now() / 1000) - p.timestamp) > PROOF_TTL_SECONDS + 300) throw new Error("TON Proof is too old.");

    const normalized = normalizeAddress(input.address);
    const onchainKey = await getWalletPublicKey(normalized);
    if (!onchainKey) throw new Error("Wallet is not active on TON yet (no public key). Make one transaction first.");
    if (!verifyProofSignature({ address: normalized, proof: p }, onchainKey)) throw new Error("Invalid wallet signature.");

    const { error } = await supabaseAdmin().rpc("bind_wallet", { p_tid: String(user.id), p_wallet: normalized });
    if (error) throw error;
    return NextResponse.json({ ok: true, wallet: normalized });
  } catch (e) {
    return NextResponse.json({ error: safeErr(e, "Wallet verification failed") }, { status: 400 });
  }
}