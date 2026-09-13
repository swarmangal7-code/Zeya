import { useEffect } from "react";
import * as THREE from "three";
import { useGLTF, Detailed } from "@react-three/drei";
import { director } from "../director";
import { experienceConfig } from "../experience.config";
import { DoorAssembly } from "./Door";

/**
 * Door entry point. Uses the (greatly improved) procedural door by default,
 * or a real GLB if `assets.door.glb` is set in experience.config.ts —
 * with DRACO decompression and a distance-based LOD silhouette.
 * The director's refs (doorLeft / doorRight / doorFrame) are the contract,
 * so knocks, light spill and the opening animation work either way.
 */
export function DoorModel() {
  const { glb, draco, lodFar } = experienceConfig.assets.door;
  if (!glb) return <DoorAssembly />;
  return <GltfDoorModel url={glb} draco={draco} lodFar={lodFar} />;
}

function GltfDoorModel({ url, draco, lodFar }: { url: string; draco: boolean; lodFar: number }) {
  const gltf = useGLTF(url, draco);
  const model = gltf.scene;

  useEffect(() => {
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        const m = o as THREE.Mesh;
        m.castShadow = true;
        m.frustumCulled = false;
      }
    });

    const left = model.getObjectByName("doorLeft");
    const right = model.getObjectByName("doorRight");
    const frame = model.getObjectByName("doorFrame");
    if (left && right && frame) {
      director.registerRefs({
        doorLeft: left as THREE.Group,
        doorRight: right as THREE.Group,
        frameGroup: frame as THREE.Group,
      });
    }
  }, [model]);

  return (
    <Detailed distances={[0, lodFar]}>
      <group>
        <primitive object={model} />
      </group>
      {/* low-poly silhouette far away */}
      <group>
        <mesh position={[0, 2.15, 0]}>
          <boxGeometry args={[3.5, 4.3, 0.2]} />
          <meshStandardMaterial color="#17120d" roughness={1} />
        </mesh>
      </group>
    </Detailed>
  );
}

if (experienceConfig.assets.door.glb) {
  useGLTF.preload(experienceConfig.assets.door.glb);
}