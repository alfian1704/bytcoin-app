import { NextResponse } from "next/server";
import { JETTON_MASTER } from "@/lib/config";
export async function GET() {
  return NextResponse.json({
    app: "BYTCOIN", network: process.env.NEXT_PUBLIC_TON_NETWORK || "mainnet", jettonMaster: JETTON_MASTER,
    tonApiConfigured: Boolean(process.env.TON_API_KEY), supabaseConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL),
    botConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN)
  });
}
