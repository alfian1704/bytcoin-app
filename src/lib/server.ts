import { createClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { verifyTelegramInitData } from "./telegram";

export const supabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server environment is missing.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
};

export async function getTelegramUser() {
  const h = await headers();
  const initData = h.get("x-telegram-init-data") || "";
  const token = process.env.TELEGRAM_BOT_TOKEN || "";
  return verifyTelegramInitData(initData, token);
}

export function isAdmin(telegramId: number) {
  const ids = (process.env.ADMIN_TELEGRAM_IDS || "").split(",").map(x => x.trim()).filter(Boolean);
  return ids.includes(String(telegramId));
}

export const errMsg = (e: unknown, fallback: string) => {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return fallback;
};
