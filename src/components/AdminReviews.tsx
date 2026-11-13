"use client";
import { useState } from "react";
export default function AdminReviews() {
  const [list, setList] = useState<any[]>([]);
  return <div>{list.map((x,i) => <div key={i}>{String(x)}</div>)}</div>;
}
