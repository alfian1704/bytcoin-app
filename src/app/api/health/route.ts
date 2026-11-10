import { NextResponse } from "next/server";
import { JETTON_MASTER } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    app: "BYTCOIN",
    network: process.env.NEXT_PUBLIC_TON_NETWORK || "mainnet",
    jettonMaster: JETTON_MASTER,
    appUrlConfigured: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    tonApiConfigured: Boolean(process.env.TON_API_KEY),
    supabaseConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL),
    botConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    botUsernameConfigured: Boolean(process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME),
    adminConfigured: Boolean(process.env.ADMIN_TELEGRAM_IDS),
    feeWalletConfigured: Boolean(process.env.NEXT_PUBLIC_FEE_WALLET)
  }, { headers: { "Cache-Control": "no-store" } });
}