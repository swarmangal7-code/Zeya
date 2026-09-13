import { useEffect, useMemo } from "react";
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
  const fog = useMemo(() => new THREE.Fog("#0a0807", 5.5, 13.5), []);

  useEffect(() => {
    scene.fog = fog;
    director.registerCamera(camera as THREE.PerspectiveCamera);
    director.registerRefs({ revealFog: fog });
    director.setStartDoor();
  }, [scene, camera, fog]);

  const world = (
    <>
      <color attach="background" args={["#080706"]} />
      <ambientLight intensity={0.14} color="#7d88a8" />

      {/* procedural environment lighting for PBR reflections */}
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" position={[0, 5, -4]} scale={[8, 4, 1]} intensity={0.9} color="#8b9ec4" />
        <Lightformer form="rect" position={[-6, 2, 3]} rotation-y={Math.PI / 2} scale={[2, 6, 1]} intensity={0.32} color="#c9a35f" />
        <Lightformer form="rect" position={[6, 2, 3]} rotation-y={-Math.PI / 2} scale={[2, 6, 1]} intensity={0.24} color="#a98d5a" />
        <Lightformer form="rect" position={[0, -2, 7]} scale={[10, 2, 1]} intensity={0.16} color="#ffd9a8" />
      </Environment>

      <DoorModel />

      {/* the room */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0a0909" roughness={0.86} metalness={0.1} envMapIntensity={0.35} />
      </mesh>
      <mesh position={[0, 3, -18]} receiveShadow>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#0d0b09" roughness={1} />
      </mesh>
      <mesh position={[-12, 3, -6]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#090807" roughness={1} />
      </mesh>
      <mesh position={[12, 3, -6]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#090807" roughness={1} />
      </mesh>

      {quality.contactShadows && (
        <ContactShadows position={[0, 0.005, 0]} opacity={0.55} scale={13} blur={2.6} far={3.2} resolution={256} color="#000000" />
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