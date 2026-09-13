import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { director } from "../director";
import { makeWoodMaps, makeGlowTexture } from "../lib/textures";
import { quality } from "../lib/quality";

const W = 3.5;      // total door opening width
const H = 4.3;      // opening height
const LW = W / 2;   // single leaf width (hinge to inner edge)
const TH = 0.11;    // leaf thickness

function WoodMaterial({ base, repeatX }: { base: string; repeatX: number }) {
  const mat = useMemo(() => {
    const maps = makeWoodMaps();
    const m = new THREE.MeshPhysicalMaterial();
    m.map = maps.color.clone();
    m.normalMap = maps.normal.clone();
    m.normalScale = new THREE.Vector2(0.9, 0.9);
    m.roughnessMap = maps.rough.clone();
    m.aoMap = maps.ao.clone();
    m.aoMapIntensity = 0.85;
    // uv2 is set globally on every door mesh once geometry is attached
    for (const t of [m.map, m.normalMap, m.roughnessMap, m.aoMap]) {
      t.repeat.set(repeatX, 1);
      t.anisotropy = 4;
      t.needsUpdate = true;
    }
    m.color = new THREE.Color(base);
    m.roughness = 0.46;
    m.metalness = 0.02;
    m.clearcoat = 1.0;
    m.clearcoatRoughness = 0.28;
    m.envMapIntensity = 1.2;
    return m;
  }, [base, repeatX]);
  return <primitive object={mat} attach="material" />;
}

const BRASS = { color: "#bd8b4c", metalness: 1, roughness: 0.28, envMapIntensity: 1.4 };

/** A gently beveled inset panel — reads as a real routed panel, not a slab. */
function PanelGeometry({ w, h, depth }: { w: number; h: number; depth: number }) {
  const geo = useMemo(() => {
    const r = Math.min(w, h) * 0.055;
    const shape = new THREE.Shape();
    // rounded-rect contour (no shape.roundRect in this three version)
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.014,
      bevelSegments: 3,
      curveSegments: 14,
    });
    g.translate(0, 0, -depth / 2);
    return g;
  }, [w, h, depth]);
  return <primitive object={geo} attach="geometry" />;
}

/** One door leaf with inset panels. Hinged at its outer edge (group origin). */
function DoorLeaf({ side }: { side: "left" | "right" }) {
  const pivot = useRef<THREE.Group>(null);
  const w = LW - 0.02;

  const panel = [
    { h: 1.55, y: 2.9 },
    { h: 1.55, y: 1.3 },
    { h: 0.9, y: 0.14 },
  ];
  const innerW = w - 0.38;
  const dark = side === "left" ? "#2B2117" : "#352A20";

  return (
    <group ref={pivot} position={[0, 0, 0]}>
      <group position={[side === "left" ? w / 2 : -w / 2, H / 2, 0]}>
        {/* stiles / rails */}
        <mesh position={[side === "left" ? w / 2 - 0.085 : -(w / 2 - 0.085), 0, 0]}>
          <boxGeometry args={[0.17, H, TH]} />
          <WoodMaterial base="#3A2C1E" repeatX={1.2} />
        </mesh>
        <mesh position={[0, H / 2 - 0.085, 0]}>
          <boxGeometry args={[w - 0.34, 0.17, TH]} />
          <WoodMaterial base="#3A2C1E" repeatX={2} />
        </mesh>
        <mesh position={[0, -(H / 2 - 0.045), 0]}>
          <boxGeometry args={[w - 0.34, 0.12, TH]} />
          <WoodMaterial base="#2E2318" repeatX={2} />
        </mesh>
        {/* mid rail where the handles live */}
        <mesh position={[0, -0.52, 0]}>
          <boxGeometry args={[w - 0.34, 0.14, TH]} />
          <WoodMaterial base="#33271A" repeatX={2} />
        </mesh>

        {/* beveled inset panels */}
        {panel.map((p, i) => (
          <mesh key={i} position={[0, p.y, -TH * 0.3]}>
            <PanelGeometry w={innerW} h={p.h * 1.02} depth={0.034} />
            <WoodMaterial base={dark} repeatX={Math.max(1.2, innerW / 1.4)} />
          </mesh>
        ))}

        {/* brass lever handle, near inner edge — plate, rose, lever, catch-light */}
        <group position={[side === "left" ? w - 0.16 : -(w - 0.16), 1.34, TH * 0.5]}>
          {/* escutcheon plate */}
          <mesh rotation={[0, 0, side === "left" ? Math.PI / 2 : -Math.PI / 2]} position={[0, 0, 0.01]}>
            <boxGeometry args={[0.1, 0.2, 0.02]} />
            <meshStandardMaterial {...BRASS} roughness={0.32} />
          </mesh>
          {/* rose */}
          <mesh position={[0, 0, 0.03]}>
            <cylinderGeometry args={[0.036, 0.033, 0.03, 20]} />
            <meshStandardMaterial {...BRASS} />
          </mesh>
          {/* stem */}
          <mesh position={[0, 0, 0.075]}>
            <cylinderGeometry args={[0.009, 0.009, 0.06, 10]} />
            <meshStandardMaterial {...BRASS} roughness={0.22} />
          </mesh>
          {/* lever */}
          <mesh position={[side === "left" ? -0.09 : 0.09, -0.02, 0.1]} rotation={[0, 0, side === "left" ? Math.PI / 2 : -Math.PI / 2]}>
            <cylinderGeometry args={[0.009, 0.009, 0.2, 10]} />
            <meshStandardMaterial {...BRASS} roughness={0.22} />
          </mesh>
          {/* lever tip */}
          <mesh position={[side === "left" ? -0.185 : 0.185, -0.028, 0.102]} rotation={[Math.PI / 2, 0, 0]}>
            <sphereGeometry args={[0.011, 10, 10]} />
            <meshStandardMaterial {...BRASS} roughness={0.18} />
          </mesh>
        </group>

        {/* hinges on outer edge */}
        {[1.0, 2.2, 3.4, 4.55].map((y) => (
          <mesh key={y} position={[side === "left" ? -(w / 2) + 0.025 : w / 2 - 0.025, y - H / 2 + 0.12, 0]}>
            <boxGeometry args={[0.05, 0.36, 0.08]} />
            <meshStandardMaterial {...BRASS} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * The full door assembly — frame + two hinged leaves.
 * Registers its pieces with the director for knock / open animation.
 */
export function DoorAssembly() {
  const frame = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const dust = useRef<THREE.Points>(null);
  const interiorGlow = useRef<THREE.Mesh>(null);
  const interiorLight = useRef<THREE.PointLight>(null);
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const handleLight = useRef<THREE.PointLight>(null);

  const glow = useMemo(() => makeGlowTexture(), []);

  const dustPositions = useMemo(() => {
    const count = quality.dustCount;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 9;
      arr[i * 3 + 1] = Math.random() * 4.6;
      arr[i * 3 + 2] = -1 + Math.random() * 6;
    }
    return arr;
  }, []);

  const dustRef = dust;
  useFrame((state) => {
    const pts = dustRef.current;
    if (!pts) return;
    const t = state.clock.elapsedTime;
    pts.position.y = (t * 0.008) % 0.15;
    pts.rotation.y = t * 0.004;
  });

  const register = () => {
    director.registerRefs({
      frameGroup: frame.current,
      doorLeft: left.current,
      doorRight: right.current,
      dust: dust.current,
      interiorGlow: interiorGlow.current,
      interiorLight: interiorLight.current,
      keyLight: keyLight.current,
      handleLight: handleLight.current,
    });
    if (frame.current) {
      frame.current.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          if (quality.shadows) m.castShadow = true;
          const geo = m.geometry as THREE.BufferGeometry | undefined;
          if (geo && !geo.getAttribute("uv2") && geo.getAttribute("uv")) {
            geo.setAttribute("uv2", geo.getAttribute("uv"));
          }
        }
      });
    }
  };

  return (
    <group ref={register} name="door-assembly">
      <group ref={frame}>
        {/* frame posts */}
        <mesh position={[-W / 2 - 0.08, H / 2, 0]}>
          <boxGeometry args={[0.18, H + 0.5, 0.4]} />
          <WoodMaterial base="#2A2016" repeatX={1} />
        </mesh>
        <mesh position={[W / 2 + 0.08, H / 2, 0]}>
          <boxGeometry args={[0.18, H + 0.5, 0.4]} />
          <WoodMaterial base="#2A2016" repeatX={1} />
        </mesh>
        {/* lintel */}
        <mesh position={[0, H + 0.19, 0]}>
          <boxGeometry args={[W + 0.36, 0.22, 0.44]} />
          <WoodMaterial base="#281E14" repeatX={1} />
        </mesh>
        {/* threshold */}
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[W + 0.36, 0.1, 0.4]} />
          <WoodMaterial base="#241A12" repeatX={1} />
        </mesh>

        {/* leaves hinged at outer edges */}
        <group ref={left} position={[-LW, 0, 0]}>
          <DoorLeaf side="left" />
        </group>
        <group ref={right} position={[LW, 0, 0]}>
          <DoorLeaf side="right" />
        </group>

        {/* architectural reveal — recessed jambs make the door read as installed */}
        <mesh position={[-LW + 0.02, H / 2 - 0.1, -0.32]}>
          <boxGeometry args={[0.1, H + 0.1, 0.5]} />
          <meshStandardMaterial color="#0B0E17" roughness={0.9} metalness={0.05} />
        </mesh>
        <mesh position={[LW - 0.02, H / 2 - 0.1, -0.32]}>
          <boxGeometry args={[0.1, H + 0.1, 0.5]} />
          <meshStandardMaterial color="#0B0E17" roughness={0.9} metalness={0.05} />
        </mesh>
        <mesh position={[0, H - 0.12, -0.3]}>
          <boxGeometry args={[W - 0.1, 0.1, 0.52]} />
          <meshStandardMaterial color="#0A0D16" roughness={0.95} metalness={0.02} />
        </mesh>
        <mesh position={[0, 0.06, -0.32]}>
          <boxGeometry args={[W + 0.6, 0.12, 0.5]} />
          <meshStandardMaterial color="#141A2B" roughness={0.85} metalness={0.1} />
        </mesh>
      </group>

      {/* interior warm glow, visible as the doors part */}
      <mesh ref={interiorGlow} position={[0, H / 2, -0.45]} scale={[W, H, 1]} rotation={[0, 0, 0]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.16} toneMapped={false} />
      </mesh>

      {/* thin light strips around the closed gap */}
      <mesh position={[0, H / 2, -0.42]} scale={[W * 0.98, H * 0.98, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.06} toneMapped={false} />
      </mesh>

      {/* warm light leaking from inside */}
      <pointLight ref={interiorLight} position={[0, H / 2, -1.2]} intensity={0} distance={8} color="#8FA8E0" decay={2} />

      {/* soft light on the handles once opening is available */}
      <pointLight ref={handleLight} position={[0, 1.32, 1.1]} intensity={0} distance={2.4} color="#B9C5E8" />

      {/* key light, casts the door's shadow on the floor */}
      {quality.shadows && (
        <directionalLight
          ref={keyLight}
          position={[-3.4, 6, 4.4]}
          intensity={0.62}
          castShadow
          shadow-mapSize-width={quality.shadowMapSize}
          shadow-mapSize-height={quality.shadowMapSize}
          shadow-camera-near={0.5}
          shadow-camera-far={20}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={8}
          shadow-camera-bottom={-1}
        />
      )}
      {!quality.shadows && <directionalLight ref={keyLight} position={[-3.4, 6, 4.4]} intensity={0.62} />}

      {/* soft pool of cool light on the floor beneath the door, grounding the composition */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0.35]} scale={[4.2, 2.4, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.07} toneMapped={false} />
      </mesh>

      {/* floating dust */}
      <points ref={dust} position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[dustPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#AEB9CC" size={0.014} transparent opacity={0.32} depthWrite={false} sizeAttenuation blending={THREE.AdditiveBlending} />
      </points>
    </group>
  );
}