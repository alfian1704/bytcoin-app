"use client";
import { useEffect, useState } from "react";
export default function MiniApp() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const load = async () => {
      if (typeof window !== "undefined") {
        const sdk = await import("@twa-dev/sdk");
        sdk.default.ready();
        setReady(true);
      }
    };
    load();
  }, []);
  return <div>{ready ? "ready" : "loading"}</div>;
}
