import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Vector3, type Group } from "three";
import { latLngToVector3 } from "../../lib/geo";
import { useReducedMotion } from "../../lib/useReducedMotion";
import type { ConflictEvent, Location } from "../../types";
import Atmosphere from "./Atmosphere";
import Clouds from "./Clouds";
import Earth, { EARTH_RADIUS } from "./Earth";
import LocationDetail from "./LocationDetail";
import Markers from "./Markers";

interface Props {
  locations: Location[];
  conflicts: ConflictEvent[];
}

type Phase = "idle" | "traveling" | "detail" | "returning";

const TRAVEL_DISTANCE = 3.6;
const TRAVEL_DURATION_S = 1.1;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface RotatingGlobeProps {
  locations: Location[];
  groupRef: React.RefObject<Group | null>;
  paused: boolean;
  reducedMotion: boolean;
  hoveredId: string | null;
  focusedId: string | null;
  setHoveredId: Dispatch<SetStateAction<string | null>>;
  setFocusedId: Dispatch<SetStateAction<string | null>>;
  onActivate: (loc: Location) => void;
  interactive: boolean;
}

/** Owns rotation for Earth + Markers together, so markers stay glued to
 * their real lat/lng as the globe turns (~150s per rotation). Rotation
 * pauses whenever a marker is targeted, the camera is traveling/showing
 * detail/returning, OR the user has asked for reduced motion -- a spinning
 * globe under an active camera flight or a fixed detail view would fight
 * both the animation and the reader, and continuous ambient spin is exactly
 * the kind of non-essential motion prefers-reduced-motion asks to remove. */
function RotatingGlobe({
  locations,
  groupRef,
  paused,
  reducedMotion,
  hoveredId,
  focusedId,
  setHoveredId,
  setFocusedId,
  onActivate,
  interactive,
}: RotatingGlobeProps) {
  useFrame((_, delta) => {
    if (groupRef.current && !paused) {
      groupRef.current.rotation.y += delta * ((Math.PI * 2) / 150);
    }
  });

  return (
    <group ref={groupRef}>
      <Earth />
      <Markers
        locations={locations}
        hoveredId={hoveredId}
        focusedId={focusedId}
        setHoveredId={setHoveredId}
        setFocusedId={setFocusedId}
        onActivate={onActivate}
        interactive={interactive}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}

interface CameraRigProps {
  phase: Phase;
  travelTargetLocal: Vector3 | null;
  rotatingGroupRef: React.RefObject<Group | null>;
  savedCamera: React.RefObject<{ position: Vector3; distance: number } | null>;
  reducedMotion: boolean;
  onArrived: () => void;
  onReturned: () => void;
}

/** Drives the camera imperatively during "traveling"/"returning" -- OrbitControls
 * is unmounted for the duration (see EarthGlobe below) so it can't fight this
 * every frame. Interpolates direction-from-center and distance separately
 * (rather than lerping raw positions) so the camera arcs over the globe's
 * surface instead of cutting straight through it. */
function CameraRig({ phase, travelTargetLocal, rotatingGroupRef, savedCamera, reducedMotion, onArrived, onReturned }: CameraRigProps) {
  const { camera } = useThree();
  const startDir = useRef(new Vector3());
  const startDist = useRef(0);
  const endDir = useRef(new Vector3());
  const endDist = useRef(0);
  const elapsed = useRef(0);
  const running = useRef<"traveling" | "returning" | null>(null);

  useEffect(() => {
    if (phase === "traveling" && travelTargetLocal && rotatingGroupRef.current) {
      const worldTarget = rotatingGroupRef.current.localToWorld(travelTargetLocal.clone());
      savedCamera.current = { position: camera.position.clone(), distance: camera.position.length() };
      startDir.current.copy(camera.position).normalize();
      startDist.current = camera.position.length();
      endDir.current.copy(worldTarget).normalize();
      endDist.current = TRAVEL_DISTANCE;
      elapsed.current = 0;
      running.current = "traveling";
    } else if (phase === "returning" && savedCamera.current) {
      startDir.current.copy(camera.position).normalize();
      startDist.current = camera.position.length();
      endDir.current.copy(savedCamera.current.position).normalize();
      endDist.current = savedCamera.current.distance;
      elapsed.current = 0;
      running.current = "returning";
    }
    // Deliberately re-run only on phase changes: the start/end refs above are
    // meant to be captured once per transition, not recomputed every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useFrame((_, delta) => {
    if (!running.current) return;
    const duration = reducedMotion ? 0.001 : TRAVEL_DURATION_S;
    elapsed.current += delta;
    const t = Math.min(elapsed.current / duration, 1);
    const eased = easeInOutCubic(t);

    const dir = startDir.current.clone().lerp(endDir.current, eased).normalize();
    const dist = startDist.current + (endDist.current - startDist.current) * eased;
    camera.position.copy(dir.multiplyScalar(dist));
    camera.lookAt(0, 0, 0);

    if (t >= 1) {
      const finished = running.current;
      running.current = null;
      if (finished === "traveling") onArrived();
      else onReturned();
    }
  });

  return null;
}

export default function EarthGlobe({ locations, conflicts }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeLocation, setActiveLocation] = useState<Location | null>(null);
  const [travelTargetLocal, setTravelTargetLocal] = useState<Vector3 | null>(null);

  const rotatingGroupRef = useRef<Group>(null);
  const savedCamera = useRef<{ position: Vector3; distance: number } | null>(null);
  const reducedMotion = useReducedMotion();

  const targeting = hoveredId !== null || focusedId !== null;
  const paused = targeting || phase !== "idle" || reducedMotion;
  const interactive = phase === "idle";

  const handleActivate = useCallback(
    (loc: Location) => {
      if (phase !== "idle") return; // guard against overlapping transitions (rapid double-click, etc.)
      setActiveLocation(loc);
      setTravelTargetLocal(latLngToVector3(loc.lat, loc.lng, EARTH_RADIUS * 1.003));
      setPhase("traveling");
    },
    [phase]
  );

  const handleBack = useCallback(() => {
    if (phase !== "detail") return;
    setPhase("returning");
  }, [phase]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (phase === "detail") {
        handleBack();
      } else if (phase === "idle" && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, handleBack]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <color attach="background" args={["#030303"]} />
        <ambientLight intensity={0.15} />

        <Suspense fallback={null}>
          <RotatingGlobe
            locations={locations}
            groupRef={rotatingGroupRef}
            paused={paused}
            reducedMotion={reducedMotion}
            hoveredId={hoveredId}
            focusedId={focusedId}
            setHoveredId={setHoveredId}
            setFocusedId={setFocusedId}
            onActivate={handleActivate}
            interactive={interactive}
          />
          <Clouds reducedMotion={reducedMotion} />
          <Atmosphere />
        </Suspense>

        {(phase === "traveling" || phase === "returning") && (
          <CameraRig
            phase={phase}
            travelTargetLocal={travelTargetLocal}
            rotatingGroupRef={rotatingGroupRef}
            savedCamera={savedCamera}
            reducedMotion={reducedMotion}
            onArrived={() => setPhase("detail")}
            onReturned={() => {
              setPhase("idle");
              setActiveLocation(null);
              setTravelTargetLocal(null);
            }}
          />
        )}

        {phase === "idle" && (
          <OrbitControls
            enablePan={false}
            enableZoom
            minDistance={3.2}
            maxDistance={9}
            autoRotate={!targeting && !reducedMotion}
            autoRotateSpeed={0.15}
            rotateSpeed={0.4}
            enableDamping
            dampingFactor={0.08}
          />
        )}
      </Canvas>

      {activeLocation && (
        <LocationDetail
          location={activeLocation}
          conflicts={conflicts}
          visible={phase === "detail"}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
