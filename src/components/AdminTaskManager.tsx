"use client";
import React from "react";

export default function AdminTaskManager() {
  const openLink = (url: string) => {
    if (typeof window !== "undefined") {
      window.open(url, "_blank");
    }
  };

  return (
    <div style={{padding:20}}>
      <h2>Admin Task Manager</h2>
      <p>Panel admin aktif.</p>
      <button onClick={() => openLink("https://t.me/")}>Open Telegram</button>
    </div>
  );
}
