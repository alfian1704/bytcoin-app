"use client";
import { useState } from "react";
export default function WithdrawalsPanel() {
  const [items, setItems] = useState<any[]>([]);
  return <div>{items.map((_, i) => <div key={i}>wd</div>)}</div>;
}
