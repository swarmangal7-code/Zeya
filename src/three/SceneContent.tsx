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
import { makeGlowTexture } from "../lib/textures";

export function SceneContent() {
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const cfg = experienceConfig.postprocessing;
  const dofRef = useRef<unknown>(null);
  const fog = useMemo(() => new THREE.Fog("#0A0F1C", 5.0, 13.0), []);
  const glow = useMemo(() => makeGlowTexture("#D6E2F8", "#536FAF"), []);

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
      <ambientLight intensity={0.12} color="#2E3A5C" />

      {/* restrained cool environment so the door keeps its own tonal range */}
      <Environment resolution={32} frames={1}>
        <Lightformer form="rect" position={[0, 5, -4]} scale={[7, 3, 1]} intensity={0.55} color="#6E84B5" />
        <Lightformer form="rect" position={[-5, 1, 4]} rotation-y={Math.PI / 2} scale={[2, 5, 1]} intensity={0.2} color="#4A5C97" />
        <Lightformer form="rect" position={[5, 1, 4]} rotation-y={-Math.PI / 2} scale={[2, 5, 1]} intensity={0.28} color="#8CA0CE" />
      </Environment>

      <DoorModel />

      {/* the interior beyond the door — a quiet corridor with a bright end */}
      <mesh position={[-2.05, 1.7, -8]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[13, 3.6]} />
        <meshStandardMaterial color="#0A0E19" roughness={1} />
      </mesh>
      <mesh position={[2.05, 1.7, -8]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[13, 3.6]} />
        <meshStandardMaterial color="#0A0E19" roughness={1} />
      </mesh>
      <mesh position={[0, 3.6, -8]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[4.1, 13]} />
        <meshStandardMaterial color="#0C111C" roughness={1} />
      </mesh>
      {/* the light waiting at the end of the corridor */}
      <mesh position={[0, 2.2, -13.7]} scale={[3.2, 3.2, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.2} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 2.4, -12.5]} intensity={12} distance={14} color="#C7D6F5" decay={2} />

      {/* the room */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0B101B" roughness={0.6} metalness={0.15} envMapIntensity={0.5} />
      </mesh>
      <mesh position={[0, 3, -18]} receiveShadow>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#0C111D" roughness={1} />
      </mesh>
      <mesh position={[-12, 3, -6]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#090C16" roughness={1} />
      </mesh>
      <mesh position={[12, 3, -6]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#090C16" roughness={1} />
      </mesh>

      {/* faint fill — keeps the shadow side readable without flattening it */}
      <directionalLight position={[-4.5, 1.4, 5]} intensity={0.06} color="#8CA0CE" />
      {/* narrow cool rim from behind/right — separates the silhouette */}
      <directionalLight position={[3.4, 2.4, -4.6]} intensity={1.1} color="#6E6AA8" />

      {quality.contactShadows && (
        <ContactShadows position={[0, 0.005, 0]} opacity={0.62} scale={13} blur={2.4} far={3.2} resolution={512} color="#000000" />
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