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
  const fog = useMemo(() => new THREE.Fog("#0A0F1C", 5.0, 13.0), []);

  useEffect(() => {
    scene.fog = fog;
    director.registerCamera(camera as THREE.PerspectiveCamera);
    director.registerRefs({ revealFog: fog });
    director.setStartDoor();
  }, [scene, camera, fog]);

  const world = (
    <>
      <ambientLight intensity={0.24} color="#4C5C80" />

      {/* procedural cool environment lighting for PBR reflections */}
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" position={[0, 6, -4]} scale={[9, 4, 1]} intensity={1.0} color="#7E93C4" />
        <Lightformer form="rect" position={[-6, 2, 3]} rotation-y={Math.PI / 2} scale={[2, 6, 1]} intensity={0.42} color="#3E4F86" />
        <Lightformer form="rect" position={[6, 2, 3]} rotation-y={-Math.PI / 2} scale={[2, 6, 1]} intensity={0.5} color="#9FB0D9" />
        <Lightformer form="rect" position={[0, -2, 7]} scale={[10, 2, 1]} intensity={0.2} color="#5670B8" />
        <Lightformer form="rect" position={[-8, 3, -2]} rotation-y={Math.PI / 2} scale={[2, 8, 1]} intensity={0.3} color="#C9D4F2" />
      </Environment>

      <DoorModel />

      {/* the room */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#0D111C" roughness={0.84} metalness={0.15} envMapIntensity={0.45} />
      </mesh>
      <mesh position={[0, 3, -18]} receiveShadow>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#0E1320" roughness={1} />
      </mesh>
      <mesh position={[-12, 3, -6]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#0A0D17" roughness={1} />
      </mesh>
      <mesh position={[12, 3, -6]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[30, 8]} />
        <meshStandardMaterial color="#0A0D17" roughness={1} />
      </mesh>

      {/* cool key from front-right — gives the door form, not a flat slab */}
      <directionalLight position={[3.6, 5.2, 4.2]} intensity={0.6} color="#A9BBDD" />
      {/* cool rim from behind the door, separating it from the dark */}
      <directionalLight position={[0, 3, -6]} intensity={1.3} color="#6F88C8" />

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