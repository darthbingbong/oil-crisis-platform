import { AdditiveBlending, BackSide, Color } from "three";
import { EARTH_RADIUS } from "./Earth";
import { atmosphereFragmentShader, atmosphereVertexShader } from "./earthShaders";

// A cool teal-blue wash (derived from the --color-refinery-teal token
// family) rather than a flat surface fill, matching the brief's use of
// that token for "gradient stops and subtle atmospheric washes only."
const ATMOSPHERE_COLOR = new Color("#35c9e0");

export default function Atmosphere() {
  return (
    <mesh>
      <sphereGeometry args={[EARTH_RADIUS * 1.15, 64, 64]} />
      <shaderMaterial
        vertexShader={atmosphereVertexShader}
        fragmentShader={atmosphereFragmentShader}
        uniforms={{ glowColor: { value: ATMOSPHERE_COLOR } }}
        side={BackSide}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </mesh>
  );
}
