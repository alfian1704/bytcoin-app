import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramUser = { id:number; first_name:string; last_name?:string; username?:string; photo_url?:string; start_param?:string };

export function verifyTelegramInitData(initData: string, botToken: string, maxAgeSeconds=86400): TelegramUser {
  if (!initData || !botToken) throw new Error("Telegram authentication is not configured.");
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("Missing Telegram initData hash.");
  params.delete("hash");
  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate || Math.floor(Date.now()/1000)-authDate > maxAgeSeconds || authDate > Math.floor(Date.now()/1000)+60) {
    throw new Error("Telegram initData expired or invalid.");
  }
  const dataCheckString = [...params.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join("\n");
  const secret = createHmac("sha256","WebAppData").update(botToken).digest();
  const calculated = createHmac("sha256",secret).update(dataCheckString).digest("hex");
  const a = Buffer.from(calculated,"hex"), b = Buffer.from(hash,"hex");
  if (a.length !== b.length || !timingSafeEqual(a,b)) throw new Error("Telegram initData signature mismatch.");
  const userRaw = params.get("user");
  if (!userRaw) throw new Error("Telegram user missing.");
  return { ...(JSON.parse(userRaw) as TelegramUser), start_param: params.get("start_param") || undefined };
}

// Checks channel/group membership through the Bot API (bot must be admin of the chat).
export async function isChatMember(chatUsername: string, userId: number): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Telegram bot is not configured.");
  const r = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${encodeURIComponent("@"+chatUsername)}&user_id=${userId}`);
  const j = await r.json().catch(() => null);
  if (!j?.ok) throw new Error("Cannot verify membership. Make sure the bot is an admin of that channel/group.");
  return ["member", "administrator", "creator"].includes(j.result?.status);
}
