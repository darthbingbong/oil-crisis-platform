import { useEffect, useState } from "react";

type BackendStatus = "loading" | "live" | "mock";

interface Props {
  backendStatus: BackendStatus;
}

const BADGE: Record<BackendStatus, { text: string; color: string }> = {
  loading: { text: "CONNECTING", color: "var(--color-ash)" },
  live: { text: "LIVE BACKEND", color: "var(--color-crude)" },
  mock: { text: "OFFLINE · MOCK DATA", color: "var(--color-alarm)" },
};

export default function Header({ backendStatus }: Props) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const badge = BADGE[backendStatus];

  return (
    <header className="flex items-center justify-between gap-4 px-4 sm:px-8 py-5">
      <div className="flex items-center gap-4 min-w-0">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: badge.color,
            boxShadow: backendStatus === "live" ? `0 0 8px ${badge.color}` : "none",
          }}
        />
        <h1
          className="section-label whitespace-nowrap"
          style={{ color: "var(--color-bone)", letterSpacing: "0.08em" }}
        >
          Oil Crisis Terminal
        </h1>
        <span className="section-label hidden sm:inline whitespace-nowrap" style={{ color: badge.color }}>
          {badge.text}
        </span>
      </div>
      <div className="data-readout text-xs hidden sm:block shrink-0" style={{ color: "var(--color-ash)" }}>
        {now.toISOString().slice(0, 19).replace("T", " ")} UTC
      </div>
    </header>
  );
}
