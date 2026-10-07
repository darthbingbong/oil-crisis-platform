import { useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Mesh } from "three";
import { EARTH_RADIUS } from "./Earth";

const CLOUDS_TEXTURE_URL = "https://threejs.org/examples/textures/planets/earth_clouds_1024.png";

/** Its own slightly-larger sphere so it visibly floats above the surface,
 * with independent slow drift (not locked to the Earth's own rotation). */
export default function Clouds({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const meshRef = useRef<Mesh>(null);
  const cloudsMap = useTexture(CLOUDS_TEXTURE_URL);

  useFrame((_, delta) => {
    if (meshRef.current && !reducedMotion) {
      meshRef.current.rotation.y += delta * (Math.PI * 2 / 110); // slightly faster than Earth -> visible independent drift
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[EARTH_RADIUS * 1.012, 64, 64]} />
      <meshStandardMaterial
        map={cloudsMap}
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </mesh>
  );
}
