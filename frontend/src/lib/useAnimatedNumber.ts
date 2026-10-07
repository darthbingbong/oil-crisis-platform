import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Counts smoothly from the previous value to `target` whenever it changes,
 * instead of snapping -- same easing curve already used for the globe's
 * camera flight (components/globe/EarthGlobe.tsx) for motion consistency
 * across the dashboard. Skips the animation on the very first render (no
 * counting up from 0 on initial mount) and entirely under
 * prefers-reduced-motion.
 */
export function useAnimatedNumber(target: number, durationMs = 700): number {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    if (reducedMotion) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    const from = fromRef.current;
    if (from === target) return;
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = easeInOutCubic(t);
      setDisplay(from + (target - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs, reducedMotion]);

  return display;
}
