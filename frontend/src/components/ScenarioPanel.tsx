import { useEffect, useState } from "react";
import { simulate } from "../lib/api";
import { localSimulate } from "../lib/localFormula";
import { useAnimatedNumber } from "../lib/useAnimatedNumber";
import Slider from "./Slider";
import type { SimulateRequest, SimulateResponse } from "../types";

interface SliderConfig {
  key: keyof SimulateRequest;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

const SLIDERS: SliderConfig[] = [
  { key: "supply_loss_pct", label: "Supply loss", min: -20, max: 20, step: 0.5, unit: "%" },
  { key: "conflict_intensity", label: "Conflict intensity", min: 0, max: 10, step: 1, unit: "" },
  { key: "detour_days", label: "Detour days", min: 0, max: 30, step: 1, unit: "d" },
  { key: "demand_change_pct", label: "Demand change", min: -50, max: 50, step: 1, unit: "%" },
];

const DEFAULT_SCENARIO: SimulateRequest = {
  supply_loss_pct: 5,
  conflict_intensity: 6,
  detour_days: 3,
  demand_change_pct: 0,
};

const DEBOUNCE_MS = 200;

function priceColor(pct: number): string {
  return Math.abs(pct) >= 40 ? "var(--color-alarm)" : "var(--color-bone)";
}

interface Props {
  /** Bumps whenever the news pipeline moves the lithium_supply_index
   * (useNewsStream's lastEventId) -- /api/v1/simulate's EV feasibility
   * numbers depend on that index server-side now (see backend/ev_lithium.py),
   * so a live news event should refresh this panel's numbers even when no
   * slider moved. undefined/null is treated as "no news yet, no-op". */
  newsUpdateSignal?: number | null;
}

export default function ScenarioPanel({ newsUpdateSignal = null }: Props) {
  const [scenario, setScenario] = useState<SimulateRequest>(DEFAULT_SCENARIO);
  const [result, setResult] = useState<SimulateResponse>(() => localSimulate(DEFAULT_SCENARIO));
  const [status, setStatus] = useState<"loading" | "live" | "offline">("loading");

  // Debounced so dragging a slider doesn't fire a request per pixel of
  // movement. Also re-runs (undebounced is fine here, it's not a drag) when
  // newsUpdateSignal changes, so a live price_event picks up the new
  // lithium_supply_index without requiring a slider touch.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      simulate(scenario)
        .then((response) => {
          if (!cancelled) {
            setResult(response);
            setStatus("live");
          }
        })
        .catch(() => {
          if (!cancelled) {
            setResult(localSimulate(scenario));
            setStatus("offline");
          }
        });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [scenario, newsUpdateSignal]);

  const animatedPricePct = useAnimatedNumber(result.predicted_price_change_pct);
  const animatedVehicleYears = useAnimatedNumber(result.ev_feasibility.gasoline_vehicle_years_displaced);
  const animatedLithiumTonnes = useAnimatedNumber(result.ev_feasibility.lithium_tonnes_required);
  const animatedLithiumRatio = useAnimatedNumber(result.ev_feasibility.lithium_supply_ratio);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h2 className="section-label" style={{ color: "var(--color-bone)" }}>
          Crisis Scenario
        </h2>
        <StatusBadge status={status} />
      </div>

      <div className="flex flex-col gap-5">
        {SLIDERS.map((s) => (
          <Slider
            key={s.key}
            label={s.label}
            min={s.min}
            max={s.max}
            step={s.step}
            unit={s.unit}
            value={scenario[s.key]}
            onChange={(value) => setScenario((prev) => ({ ...prev, [s.key]: value }))}
          />
        ))}
      </div>

      <div className="hairline" />

      <div>
        <div className="section-label mb-3">Predicted price change</div>
        <div
          data-testid="predicted-price-change"
          className="data-readout font-medium leading-none"
          style={{ fontSize: "clamp(48px, 6vw, 72px)", color: priceColor(result.predicted_price_change_pct) }}
        >
          {animatedPricePct > 0 ? "+" : ""}
          {animatedPricePct.toFixed(2)}%
        </div>
        <p className="text-sm font-light leading-relaxed mt-4" style={{ color: "var(--color-ash)" }}>
          {result.explanation}
        </p>
      </div>

      <div className="hairline" />

      <div>
        <div className="section-label mb-4">EV / lithium feasibility</div>
        <div className="grid grid-cols-2 gap-6 mb-5">
          <StatBlock
            label="Vehicle-years displaced"
            value={Math.round(animatedVehicleYears).toLocaleString()}
          />
          <StatBlock
            label="Lithium required (t)"
            value={Math.round(animatedLithiumTonnes).toLocaleString()}
          />
        </div>
        <div className="section-label mb-2">vs. world annual lithium supply</div>
        <RatioBar ratio={result.ev_feasibility.lithium_supply_ratio} animatedRatio={animatedLithiumRatio} />
        <p className="text-sm font-light leading-relaxed mt-4" style={{ color: "var(--color-ash)" }}>
          {result.ev_feasibility.explanation}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "loading" | "live" | "offline" }) {
  const color =
    status === "live" ? "var(--color-crude)" : status === "offline" ? "var(--color-alarm)" : "var(--color-ash)";
  const text = status === "live" ? "LIVE" : status === "offline" ? "OFFLINE" : "CONNECTING";
  return (
    <span className="section-label flex items-center gap-1.5" style={{ color }}>
      <span
        className="w-1 h-1 rounded-full"
        style={{ background: color, boxShadow: status === "live" ? `0 0 6px ${color}` : "none" }}
      />
      {text}
    </span>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] mb-1.5" style={{ color: "var(--color-ash)" }}>
        {label}
      </div>
      <div className="data-readout text-xl" style={{ color: "var(--color-ion)" }}>
        {value}
      </div>
    </div>
  );
}

function RatioBar({ ratio, animatedRatio }: { ratio: number; animatedRatio: number }) {
  // Bar width/number count smoothly via animatedRatio; the alarm/ion color
  // threshold uses the real final ratio so it doesn't flicker mid-count.
  const pct = Math.min(animatedRatio, 1) * 100;
  const over = ratio > 1;
  const color = over ? "var(--color-alarm)" : "var(--color-ion)";
  return (
    <div className="relative">
      <div className="w-full h-px" style={{ background: "rgba(244,241,234,0.12)" }}>
        <div className="h-px" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
      </div>
      {over && (
        <span className="data-readout absolute right-0 -top-4 text-[11px]" style={{ color }}>
          {animatedRatio.toFixed(1)}x
        </span>
      )}
    </div>
  );
}
