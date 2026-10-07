// Day/night Earth shader: blends the NASA day map and night-lights map
// based on the angle between the surface normal and a fixed "sun"
// direction, so the terminator sweeps correctly across the surface as
// the globe auto-rotates (normals are transformed to world space, not
// left in object space, precisely so this works under rotation).
export const earthVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vUv = uv;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const earthFragmentShader = /* glsl */ `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform sampler2D specularTexture;
  uniform vec3 sunDirection;

  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    vec3 dayColor = texture2D(dayTexture, vUv).rgb;
    vec3 nightColor = texture2D(nightTexture, vUv).rgb;
    float oceanMask = texture2D(specularTexture, vUv).r;

    float sunFacing = dot(normalize(vWorldNormal), normalize(sunDirection));
    float dayAmount = smoothstep(-0.15, 0.15, sunFacing);

    vec3 color = mix(nightColor * 1.4, dayColor, dayAmount);

    // Faint ocean specular highlight on the day side only.
    vec3 reflectDir = reflect(-normalize(sunDirection), normalize(vWorldNormal));
    float specular = pow(max(reflectDir.z, 0.0), 10.0) * oceanMask * dayAmount;
    color += vec3(0.35, 0.4, 0.45) * specular * 0.4;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// Fresnel rim-glow atmosphere: back-side sphere, brightest at the grazing
// limb, additive-blended over the scene -- the standard technique for a
// realistic atmospheric halo.
export const atmosphereVertexShader = /* glsl */ `
  varying vec3 vNormal;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 glowColor;

  varying vec3 vNormal;

  void main() {
    float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
    gl_FragColor = vec4(glowColor, 1.0) * intensity;
  }
`;
