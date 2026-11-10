import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  let url = (process.env.NEXT_PUBLIC_APP_URL || "https://bytcoin-app.vercel.app").replace(/\/+$/, "");

  if (!url.startsWith("https://") || url.endsWith("-") || url.length < 20) {
    url = "https://bytcoin-app.vercel.app";
  }

  return NextResponse.json({
    url,
    name: "BYTCOIN",
    iconUrl: `${url}/icon.png`,
    termsOfUseUrl: `${url}/whitepaper`,
    privacyPolicyUrl: `${url}/whitepaper`,
  });
}