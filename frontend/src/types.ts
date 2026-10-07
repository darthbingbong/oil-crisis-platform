// Mirrors the Pydantic models in backend/main.py exactly -- field names and
// shapes must stay in sync with the FastAPI response_models there.

export interface SimulateRequest {
  supply_loss_pct: number;
  conflict_intensity: number;
  detour_days: number;
  demand_change_pct: number;
}

export interface EvFeasibility {
  barrels_per_day_lost: number;
  gasoline_vehicle_years_displaced: number;
  lithium_tonnes_required: number;
  lithium_supply_ratio: number;
  explanation: string;
}

export interface SimulateResponse {
  predicted_price_change_pct: number;
  explanation: string;
  model_used: string;
  ev_feasibility: EvFeasibility;
}

export interface ConflictEvent {
  name: string;
  event_date: string;
  chokepoint: string;
  conflict_intensity: number;
  supply_loss_pct: number;
  lat: number | null;
  lng: number | null;
}

export interface RefineryHub {
  name: string;
  country: string;
  lat: number;
  lng: number;
  capacity_bpd: number;
  hub_type: "refinery" | "export_terminal" | "refinery_and_export_terminal";
  nearest_chokepoint: string;
  notes: string;
}

export interface ChokepointRisk {
  chokepoint: string;
  capacity_at_risk_bpd: number;
  pct_of_global_daily_production: number;
  affected_hubs: string[];
}

export const KNOWN_CHOKEPOINTS = ["Hormuz", "Bab el-Mandeb", "Suez", "Malacca"] as const;
export type Chokepoint = (typeof KNOWN_CHOKEPOINTS)[number];

// Unified globe-marker/detail-view data shape. "crude" = oil supply side
// (chokepoints, refinery/export hubs); "ion" = EV/lithium-transition demand
// side (major consuming cities). Every metric must carry real data or say
// so in sourceNote -- see LocationMetric.
export interface LocationMetric {
  label: string;
  value: string;
  delta?: string;
  unit?: string;
}

export interface Location {
  id: string;
  name: string;
  type: "chokepoint" | "city" | "hub";
  lat: number;
  lng: number;
  accent: "crude" | "ion";
  /** 0-1, drives marker glow intensity on the globe. */
  severity: number;
  metrics: LocationMetric[];
  narrative: string;
  sourceNote: string;
}

// News pipeline (backend/news/*) -- mirrors news/db.py's price_state and
// row_to_alert_dict shapes exactly. ALWAYS a simulation calibrated off
// classified news, never a live market feed -- see price_engine.py.
export interface PriceState {
  id: number;
  crude_price_usd: number;
  rolling_baseline_usd: number;
  lithium_supply_index: number;
  last_updated_at: string;
}

export type ClassifierUsed = "rules" | "claude";

export interface AlertEvent {
  id: number;
  occurred_at: string;
  article_title: string;
  article_url: string;
  event_type: string;
  severity: number;
  confidence: number;
  classifier_used: ClassifierUsed;
  price_before: number | null;
  price_after: number | null;
  price_pct_change: number | null;
  lithium_index_before: number | null;
  lithium_index_after: number | null;
  chokepoints: string[];
  countries: string[];
  summary: string;
}
