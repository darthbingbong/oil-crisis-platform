// Builds the unified Location[] shape (see types.ts) that drives both the
// globe markers and (in a later stage) the location-detail view, from the
// project's existing real data (chokepoints, refineries.csv) plus the
// illustrative cities list.

import { CITIES } from "../data/cities";
import { computeChokepointRisk } from "./chokepointRisk";
import { CHOKEPOINT_COORDS } from "./constants";
import type { Location, RefineryHub } from "../types";

const KNOWN_CHOKEPOINT_NAMES: Record<string, string> = {
  hormuz: "Hormuz",
  "bab el-mandeb": "Bab el-Mandeb",
  suez: "Suez",
  malacca: "Malacca",
};

export function buildLocations(refineries: RefineryHub[]): Location[] {
  const maxCapacity = Math.max(1, ...refineries.map((r) => r.capacity_bpd));

  const chokepointLocations: Location[] = Object.entries(CHOKEPOINT_COORDS).map(([key, coord]) => {
    const name = KNOWN_CHOKEPOINT_NAMES[key] ?? key;
    const risk = computeChokepointRisk(refineries, name);
    return {
      id: `chokepoint-${key}`,
      name,
      type: "chokepoint",
      lat: coord.lat,
      lng: coord.lng,
      accent: "crude",
      severity: Math.min(1, risk.capacity_at_risk_bpd / 6_500_000),
      metrics: [
        { label: "Capacity at risk", value: risk.capacity_at_risk_bpd.toLocaleString(), unit: "bpd" },
        {
          label: "Share of global daily production",
          value: (risk.pct_of_global_daily_production * 100).toFixed(1),
          unit: "%",
        },
        { label: "Dependent hubs", value: String(risk.affected_hubs.length) },
      ],
      narrative:
        risk.affected_hubs.length > 0
          ? `${risk.affected_hubs.join(", ")} depend on this chokepoint remaining open.`
          : "No tracked refinery/export hubs depend on this chokepoint in the current dataset.",
      sourceNote: "Real: computed from backend/data/refineries.csv (nearest_chokepoint + capacity_bpd).",
    };
  });

  const hubLocations: Location[] = refineries.map((r) => ({
    id: `hub-${r.name}`,
    name: r.name,
    type: "hub",
    lat: r.lat,
    lng: r.lng,
    accent: "crude",
    severity: Math.min(1, r.capacity_bpd / maxCapacity),
    metrics: [
      { label: "Capacity", value: r.capacity_bpd.toLocaleString(), unit: "bpd" },
      { label: "Type", value: r.hub_type.replaceAll("_", " ") },
      { label: "Depends on", value: r.nearest_chokepoint },
    ],
    narrative: r.notes,
    sourceNote: "Real: backend/data/refineries.csv.",
  }));

  const cityLocations: Location[] = CITIES.map((c) => ({
    id: `city-${c.id}`,
    name: c.name,
    type: "city",
    lat: c.lat,
    lng: c.lng,
    accent: "ion",
    severity: 0.6,
    metrics: [
      { label: "Local fuel price sensitivity", value: "—", unit: "illustrative" },
      { label: "EV transition demand", value: "—", unit: "illustrative" },
    ],
    narrative: `${c.name}, ${c.country} -- a major demand center for the EV/lithium transition side of this platform.`,
    sourceNote:
      "Illustrative placeholder: this platform has no live per-city economic dataset yet. Coordinates are real; impact figures are not.",
  }));

  return [...chokepointLocations, ...hubLocations, ...cityLocations];
}
