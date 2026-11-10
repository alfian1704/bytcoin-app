"use client";
import nextDynamic from "next/dynamic";

const AdminTaskManager = nextDynamic(() => import("@/components/AdminTaskManager"), { ssr: false, loading: () => null });

export default function AdminPage() { return <AdminTaskManager />; }