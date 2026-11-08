"use client";
import nextDynamic from "next/dynamic";
export const dynamic = "force-dynamic";
const MiniApp = nextDynamic(() => import("@/components/MiniApp").then((mod) => mod.MiniApp), { ssr: false, loading: () => null });
export default function Home() { return <MiniApp />; }
