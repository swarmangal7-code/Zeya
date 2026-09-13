# Asset Manifest

Every asset in this experience is **procedurally generated at runtime**.
No external, copyrighted, or network-fetched assets are used.

| Asset            | Source                                   | License status       |
|------------------|------------------------------------------|----------------------|
| Door mesh        | procedural (beveled panels, PBR maps) `src/three/Door.tsx` | original / ours |
| Wood maps        | canvas-generated color/normal/roughness `src/lib/textures.ts` | original / ours |
| Glow sprites     | radial-gradient canvas texture           | original / ours      |
| Dust particles   | generated point cloud                    | original / ours      |
| Environment map  | drei `Environment` + `Lightformer`s      | generated at runtime |
| All sound        | Web Audio synthesis `src/audio` (optional samples auto-loaded) | original / ours |
| Fonts            | self-hosted via @fontsource (Inter, Cormorant Garamond) | OFL |
| Fallback door    | CSS gradients `.dfb`                     | original / ours      |
| Scene art        | optional CSS gradients/glows in `.sc-*`  | original / ours      |
| Post-processing  | libraries `postprocessing` + `@react-three/postprocessing` | MIT |

**Rule:** if you add any third-party asset (sound, model, texture, image),
record it in this table with its license before committing. Do not include
assets you don't have the right to use.

**Swap points for future real assets:**
- Door model  → `/public/models` + `src/three/Door.tsx`
- Textures    → `/public/textures` + `src/lib/textures.ts`
- Audio       → `/public/audio` + `src/audio/AudioManager.ts`
- Images      → `/public/images`