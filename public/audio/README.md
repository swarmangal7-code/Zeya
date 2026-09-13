# /public/audio

Sound is synthesized at runtime with the Web Audio API in
`src/audio/AudioManager.ts` — no audio files are shipped and nothing is
subject to a license you don't have.

Real samples are **auto-detected**: files matching `audio.manifest`
(`/public/audio/<key>.mp3|ogg|wav`) are decoded during the loading screen
and replace the synthesized version per key. Missing keys fall back to the
synth silently.

| Manifest key  | Playing         | Suggested file                     |
|---------------|-----------------|------------------------------------|
| `ambient`     | room drone      | `/audio/ambient.mp3`               |
| `knock1`      | first knock     | `/audio/knock1.mp3`                |
| `knock2`      | second knock    | `/audio/knock2.mp3`                |
| `door-open`   | door swing      | `/audio/door-open.mp3`             |
| `unlock`      | unlock chime    | `/audio/unlock.mp3`                |
| `error`       | wrong PIN       | `/audio/error.mp3`                 |
| `click`       | UI tick         | `/audio/click.mp3`                 |

Only use assets you own or that are licensed for your use. Reverse-domain
each file; keep everything documented in `ASSET_MANIFEST.md`.