import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TonProvider } from "@/components/TonProvider";

export const metadata: Metadata = {
  title: "BYTCOIN — $BYT",
  description: "BYTCOIN Telegram Mining Mini App",
  manifest: "/manifest.json"
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#080808"
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><TonProvider>{children}</TonProvider></body></html>;
}
