'use client';
import { TonConnectUIProvider } from "@tonconnect/ui-react";

export function TonProvider({ children }: { children: React.ReactNode }) {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://bytcoin-app.vercel.app").replace(/\/+$/, "");
  const manifest = `${base}/tonconnect-manifest.json`;
  const returnUrl = process.env.NEXT_PUBLIC_TWA_RETURN_URL;
  return (
    <TonConnectUIProvider
      manifestUrl={manifest}
      actionsConfiguration={returnUrl ? { twaReturnUrl: returnUrl as `${string}://${string}` } : undefined}
    >
      {children}
    </TonConnectUIProvider>
  );
}