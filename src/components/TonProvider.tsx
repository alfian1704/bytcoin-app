'use client';
import { TonConnectUIProvider } from "@tonconnect/ui-react";
export function TonProvider({ children }: { children: React.ReactNode }) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "");
  const manifest = process.env.NEXT_PUBLIC_TONCONNECT_MANIFEST_URL || `${base}/tonconnect-manifest.json`;
  const returnUrl = process.env.NEXT_PUBLIC_TWA_RETURN_URL; // e.g. https://t.me/YourBot/app
  return (
    <TonConnectUIProvider manifestUrl={manifest} actionsConfiguration={returnUrl ? { twaReturnUrl: returnUrl as `${string}://${string}` } : undefined}>
      {children}
    </TonConnectUIProvider>
  );
}
