# /public/models

Place real 3D door assets here (GLTF/GLB, ideally DRACO-compressed).

Replacing the procedural door is a swap at `src/three/Door.tsx`: load the
model with `useGLTF("/models/your-door.glb")` inside `DoorAssembly`, keep
registering the same refs at `src/director.ts`, and scene logic (knocks,
opening, light spill) keeps working unchanged.

Recommended structure for a real door model:
```
/public/models/door.glb        # two separable leaves + frame
```
The leaves must be separate objects so the director can rotate each around
its hinge; name them `doorLeft` and `doorRight`.

No assets are currently shipped — the door, wood grain, glow, dust and
sounds are all generated procedurally, so nothing here can violate a license.