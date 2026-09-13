# Where doors open — a cinematic interactive experience

A single-page cinematic journey: loading → PIN lockscreen → a physically
reacting 3D door → knock knock → open the door → reveal → a scrollable
editorial chapter "behind the door".

## Run

```bash
npm install
npm run dev        # develop
npm run build      # typecheck + production build
npm run preview    # serve the build
```

## The flow

`loading → locked → unlocking → door_idle → knock_1 → knock_2 → open_available → opening → revealing → revealed → scroll`

All states live in one Zustand store (`src/state/useExperience.ts`). Scenes
watch it; the 3D director (`src/director.ts`) turns the state into motion
through refs + GSAP, without React re-renders.

## Change the PIN

`src/experience.config.ts` → `pin` (default `"1234"`), or set the
`VITE_EXPERIENCE_PIN` env var at build time.

## Change text & personal content

Everything in `src/experience.config.ts`:
- `text` — loading steps, lock screen, CTA, reveal titles, continue label.
- `personal` — name / signature.
- `sections` — the scroll chapter's editorial entries
  (`chapter | memory | quote | closing`). Drop in your own words, memories,
  symbols. Images: drop files in `/public/images` and add an art element.

## The 3D door

`assets.door.glb` + `assets.door.draco` + `assets.door.lodFar` in the config.
Set `glb: "/models/door.glb"` to swap the upgraded procedural door for a
real GLB (DRACO + LOD included). Leaves must be separate meshes named
`doorLeft` / `doorRight`; frame named `doorFrame`. The director's refs are
the contract — knocks, light spill, opening all keep working.

Procedural door improvements shipped with v1.2:
- beveled routed panels, coherent color/normal/roughness wood maps
  (`src/lib/textures.ts`), clearcoat PBR.

## Post-processing

`postprocessing` block in config. Applied only on the high tier
(WebGL2 + device tier detection in `src/lib/quality.ts`): subtle bloom,
depth of field, chromatic aberration, noise, vignette. Lower tiers get CSS
grain/vignette instead.

## Audio

Synthesized Web Audio with roomsized convolution reverb (pre-delay + tail),
spatial panning (knock 1 left, knock 2 right). Optional real samples are
auto-loaded from `/public/audio` at startup — `audio.manifest` lists the
keys — with the synth as fallback. See `/public/audio/README.md` +
`/public/ASSET_MANIFEST.md`. Sound initializes on the first user gesture.

## Scrolling chapter

`ScrollScene.tsx` = Lenis smooth scroll + GSAP ScrollTrigger section reveals,
all data driven by `experienceConfig.sections`. Native scroll under reduced
motion. "replay" re-locks the door.

## Limits & next steps

- Door/audio are generated, not sampled — feed them a real GLB + samples
  for photoreal/recorded quality (drop-in paths configured above).
- PIN is client-side by design; swap for real auth in `LockScreenScene` +
  config only.
- Rough visual QA in a real browser is yours to run — no browser automation
  available here.