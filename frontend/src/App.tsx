import { useCallback, useMemo, useState } from "react";
import ChokepointPanel from "./components/ChokepointPanel";
import EarthGlobe from "./components/globe/EarthGlobe";
import Header from "./components/Header";
import HistoricalChart from "./components/HistoricalChart";
import ScenarioPanel from "./components/ScenarioPanel";
import { mockConflicts } from "./data/mockConflicts";
import { mockRefineries } from "./data/mockRefineries";
import { useLiveOrMock } from "./hooks/useLiveOrMock";
import { getConflicts, getRefineries } from "./lib/api";
import { buildLocations } from "./lib/locations";

export default function App() {
  const [selectedChokepoint, setSelectedChokepoint] = useState<string | null>(null);

  const conflictsFetcher = useCallback(() => getConflicts(), []);
  const refineriesFetcher = useCallback(() => getRefineries(), []);
  const { data: conflicts, status: conflictsStatus } = useLiveOrMock(conflictsFetcher, mockConflicts);
  const { data: refineries, status: refineriesStatus } = useLiveOrMock(refineriesFetcher, mockRefineries);

  const locations = useMemo(() => buildLocations(refineries), [refineries]);

  const backendStatus =
    conflictsStatus === "loading" || refineriesStatus === "loading"
      ? "loading"
      : conflictsStatus === "live" && refineriesStatus === "live"
        ? "live"
        : "mock";

  return (
    <div className="h-screen flex flex-col bg-void">
      <Header backendStatus={backendStatus} />
      <main className="flex-1 flex flex-col overflow-y-auto lg:grid lg:grid-cols-[1fr_400px] lg:overflow-hidden gap-0">
        <div className="flex flex-col lg:min-h-0">
          <div className="min-h-[320px] h-[320px] lg:h-auto lg:flex-1 relative">
            <EarthGlobe locations={locations} conflicts={conflicts} />
          </div>
          <div className="px-8 pb-8 pt-2">
            <HistoricalChart conflicts={conflicts} />
          </div>
        </div>
        <div className="flex flex-col gap-16 lg:overflow-y-auto px-8 py-10 lg:border-l border-white/5">
          <ScenarioPanel />
          <ChokepointPanel
            selected={selectedChokepoint}
            onSelect={setSelectedChokepoint}
            refineries={refineries}
          />
        </div>
      </main>
    </div>
  );
}
