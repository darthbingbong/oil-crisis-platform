// Mirrors backend/main.py's CHOKEPOINT_COORDS exactly.
export const CHOKEPOINT_COORDS: Record<string, { lat: number; lng: number }> = {
  hormuz: { lat: 26.57, lng: 56.25 },
  "bab el-mandeb": { lat: 12.58, lng: 43.32 },
  suez: { lat: 30.44, lng: 32.34 },
  malacca: { lat: 2.5, lng: 101.3 },
};

// Mirrors index.css's @theme token values -- kept as JS constants because
// SVG-based libraries (Recharts) and Three.js materials can't read CSS
// custom properties directly. Keep these two in sync by hand.
export const TOKENS = {
  void: "#030303",
  bone: "#f4f1ea",
  ash: "#8a8580",
  crude: "#e8871e",
  ion: "#35e0c9",
  alarm: "#ff3b3b",
  refineryTeal: "#0d3b3d",
} as const;

export const HUB_TYPE_COLOR: Record<string, string> = {
  refinery: TOKENS.crude,
  export_terminal: TOKENS.crude,
  refinery_and_export_terminal: TOKENS.crude,
};
