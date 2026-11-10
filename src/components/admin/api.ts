import WebApp from "@twa-dev/sdk";

export async function adminFetch<T = Record<string, unknown>>(
  url: string,
  init?: { method?: string; body?: unknown }
): Promise<T> {
  const res = await fetch(url, {
    method: init?.method || "GET",
    headers: { "Content-Type": "application/json", "x-telegram-init-data": WebApp.initData || "" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store"
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j as { error?: string }).error || "Request failed");
  return j as T;
}

export const errText = (e: unknown) => (e instanceof Error ? e.message : "Error");