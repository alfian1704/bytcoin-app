"use client";
import { useState } from "react";
export default function ClaimsPanel() {
  const [items, setItems] = useState<any[]>([]);
  return <div>{items.map((_, i) => <div key={i}>claim</div>)}</div>;
}
