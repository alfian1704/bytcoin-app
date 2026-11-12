"use client";
import nextDynamic from "next/dynamic";

const MiniApp = nextDynamic(() => import("@/components/MiniApp").then((m) => m.MiniApp), { ssr: false, loading: () => null });

export default function Home() { return <MiniApp />; }