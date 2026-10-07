import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/** Reactive (not a one-time snapshot) -- picks up a live OS-setting change
 * while the app is open, not just the value at first render. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const onChange = () => setReduced(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return reduced;
}
