import { useEffect, useState } from "react";

export type DataStatus = "loading" | "live" | "mock";

/**
 * Try the real backend first; if it's unreachable (not running, CORS, etc.)
 * fall back to the given mock data so the app stays usable rather than
 * breaking outright. `status` tells the UI which one it's actually showing.
 */
export function useLiveOrMock<T>(fetcher: () => Promise<T>, mock: T): { data: T; status: DataStatus } {
  const [data, setData] = useState<T>(mock);
  const [status, setStatus] = useState<DataStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setStatus("live");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(mock);
          setStatus("mock");
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, status };
}
