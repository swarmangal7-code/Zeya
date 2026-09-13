# /public/textures

Procedural textures are generated at runtime in `src/lib/textures.ts`
(wood grain, glow sprites, reverb impulse response). None are shipped.

To use real scanned textures later:
- drop files here (PNG/JPG/WebP, keep them sRGB-flipped for albedo)
- replace the `makeWoodTexture(...)` call in `src/three/Door.tsx` with
  `useTexture("/textures/wood_albedo.jpg")` from `@react-three/drei`
- set `roughnessMap`, `normalMap`, `aoMap` for physical fidelity