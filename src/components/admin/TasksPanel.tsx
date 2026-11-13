"use client";
import { useState } from "react";
export default function TasksPanel() {
  const [items, setItems] = useState<any[]>([]);
  return <div>{items.map((_, i) => <div key={i}>task</div>)}</div>;
}
