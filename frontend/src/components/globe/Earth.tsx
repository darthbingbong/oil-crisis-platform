import { useTexture } from "@react-three/drei";
import { Vector3 } from "three";
import { earthFragmentShader, earthVertexShader } from "./earthShaders";

// Standard NASA Blue Marble / Black Marble derivative texture set,
// hosted by the three.js project's official examples (MIT project,
// public-domain NASA source imagery -- threejs.org/examples/textures/planets).
const DAY_TEXTURE_URL = "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg";
const NIGHT_TEXTURE_URL = "https://threejs.org/examples/textures/planets/earth_lights_2048.png";
const SPECULAR_TEXTURE_URL = "https://threejs.org/examples/textures/planets/earth_specular_2048.jpg";

const SUN_DIRECTION = new Vector3(5, 2, 5).normalize();

export const EARTH_RADIUS = 2;

/** Just the shaded sphere -- rotation is owned by the parent group in
 * EarthGlobe.tsx so markers (siblings in that group) stay glued to the
 * correct lat/lng as the globe turns. */
export default function Earth() {
  const [dayMap, nightMap, specularMap] = useTexture([
    DAY_TEXTURE_URL,
    NIGHT_TEXTURE_URL,
    SPECULAR_TEXTURE_URL,
  ]);

  return (
    <mesh>
      <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
      <shaderMaterial
        vertexShader={earthVertexShader}
        fragmentShader={earthFragmentShader}
        uniforms={{
          dayTexture: { value: dayMap },
          nightTexture: { value: nightMap },
          specularTexture: { value: specularMap },
          sunDirection: { value: SUN_DIRECTION },
        }}
      />
    </mesh>
  );
}
