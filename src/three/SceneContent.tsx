import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { Environment, Lightformer, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom, DepthOfField, ChromaticAberration, Noise, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { director } from "../director";
import { DoorModel } from "./DoorModel";
import { CameraRig } from "./CameraRig";
import { quality } from "../lib/quality";
import { experienceConfig } from "../experience.config";

export function SceneContent() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const cfg = experienceConfig.postprocessing;
  const dofRef = useRef<unknown>(null);
  const fog = useMemo(() => new THREE.Fog("#0A0F1C", 5.0, 13.0), []);

  useEffect(() => {
    scene.fog = fog;
    director.registerCamera(camera as THREE.PerspectiveCamera);
    // DepthOfField's effect instance supports live focus/bokeh mutation (CameraRig lerps it)
    const eff = dofRef.current as { focusDistance: number; bokehScale: number; focalLength: number } | null;
    director.registerRefs({ revealFog: fog, dofEffect: eff });
    director.setStartDoor();
  }, [scene, camera, fog]);

  const world = (
    <>
      <ambientLight intensity={0.16} color="#3A4A7D" />

      {/* soft overhead wash — architectural, even, barely there */}
      <directionalLight position={[0, 7.5, 1.5]} intensity={0.35} color="#CAD4E8" />

      {/* procedural cool environment lighting for PBR reflections */}
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" position={[0, 6, -4]} scale={[9, 4, 1]} intensity={1.0} color="#7E9CD0" />
        <Lightformer form="rect" position={[-6, 2, 3]} rotation-y={Math.PI / 2} scale={[2, 6, 1]} intensity={0.4} color="#3A4A7D" />
        <Lightformer form="rect" position={[6, 2, 3]} rotation-y={-Math.PI / 2} scale={[2, 6, 1]} intensity={0.5} color="#A8B8E0" />
        <Lightformer form="rect" position={[0, -2, 7]} scale={[10, 2, 1]} intensity={0.2} color="#536FAF" />
        <Lightformer form="rect" position={[-8, 3, -2]} rotation-y={Math.PI / 2} scale={[2, 8, 1]} intensity={0.3} color="#C2CFEA" />
      </Environment>

      <DoorModel />

      {/* the room */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0B101B" roughness={0.55} metalness={0.18} envMapIntensity={0.7} />
      </mesh>
      <mesh position={[0, 3, -18]} receiveShadow>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#0D1320" roughness={1} />
      </mesh>
      <mesh position={[-12, 3, -6]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#090D18" roughness={1} />
      </mesh>
      <mesh position={[12, 3, -6]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#090D18" roughness={1} />
      </mesh>

      {/* faint cool fill from the left — keeps the shadow side from going dead */}
      <directionalLight position={[-4.5, 1.6, 5]} intensity={0.14} color="#8CA0CE" />
      {/* cool key from front-right — gives the door form, not a flat slab */}
      <directionalLight position={[3.6, 5.2, 4.2]} intensity={0.62} color="#C4CEE4" />
      {/* strong narrow rim from behind/right — separates the door from the dark */}
      <directionalLight position={[4, 3, -5]} intensity={1.7} color="#6E6AA8" />
      {/* cool rim from behind the door, separating it from the dark */}
      <directionalLight position={[0, 3, -6]} intensity={0.5} color="#56597F" />

      {quality.contactShadows && (
        <ContactShadows position={[0, 0.005, 0]} opacity={0.6} scale={13} blur={2.6} far={3.2} resolution={256} color="#000000" />
      )}

      <CameraRig />
    </>
  );

  if (!quality.postprocess) return world;

  return (
    <EffectComposer multisampling={4}>
      <Bloom
        intensity={cfg.bloom.intensity}
        luminanceThreshold={cfg.bloom.luminanceThreshold}
        luminanceSmoothing={cfg.bloom.luminanceSmoothing}
        radius={cfg.bloom.radius}
        mipmapBlur
      />
      <DepthOfField
        ref={dofRef as never}
        focusDistance={cfg.dof.focusDistance}
        focalLength={cfg.dof.focalLength}
        bokehScale={cfg.dof.bokehScale}
      />
      <ChromaticAberration offset={new THREE.Vector2(cfg.chromaticAberration, cfg.chromaticAberration)} radialModulation={false} modulationOffset={0} />
      <Noise premultiply opacity={cfg.noise} blendFunction={BlendFunction.OVERLAY} />
      <Vignette eskil={false} offset={0.28} darkness={cfg.vignette} />
      {world}
    </EffectComposer>
  );
}