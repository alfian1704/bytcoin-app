import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const url = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  return NextResponse.json({ url, name: "BYTCOIN", iconUrl: `${url}/icon.png` });
}
