// Thin client for the real FastAPI backend. Requests go to /api/v1/... which
// vite.config.ts proxies to http://127.0.0.1:8000 in dev; in production this
// assumes the frontend is served from behind the same origin as the API (or
// a reverse proxy doing the same job) -- revisit if that stops being true.

import type { ChokepointRisk, ConflictEvent, RefineryHub, SimulateRequest, SimulateResponse } from "../types";

const API_BASE = "/api/v1";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${res.status} ${body}`);
  }
  return res.json() as Promise<T>;
}

export function simulate(req: SimulateRequest): Promise<SimulateResponse> {
  return fetchJson<SimulateResponse>("/simulate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}

export function getConflicts(): Promise<ConflictEvent[]> {
  return fetchJson<ConflictEvent[]>("/conflicts");
}

export function getRefineries(): Promise<RefineryHub[]> {
  return fetchJson<RefineryHub[]>("/refineries");
}

export function getChokepointRisk(chokepoint: string): Promise<ChokepointRisk> {
  return fetchJson<ChokepointRisk>(`/refineries/at-risk/${encodeURIComponent(chokepoint)}`);
}
