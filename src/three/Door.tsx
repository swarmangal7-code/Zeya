import { useMemo, useRef } from "react";
import * as THREE from "three";
import { director } from "../director";
import { makeWoodMaps, makeGlowTexture } from "../lib/textures";
import { quality } from "../lib/quality";
import { experienceConfig } from "../experience.config";

const SCALE = experienceConfig.door.scale;
const W = 3.5 * SCALE;   // total door opening width
const H = 4.3 * SCALE;   // opening height
const LW = W / 2;        // single leaf width (hinge to inner edge)
const TH = 0.13 * SCALE; // leaf thickness

function WoodMaterial({ base, repeatX }: { base: string; repeatX: number }) {
  const mat = useMemo(() => {
    const maps = makeWoodMaps();
    const m = new THREE.MeshPhysicalMaterial();
    m.map = maps.color.clone();
    m.normalMap = maps.normal.clone();
    m.normalScale = new THREE.Vector2(0.7, 0.7);
    m.roughnessMap = maps.rough.clone();
    m.aoMap = maps.ao.clone();
    m.aoMapIntensity = 0.9;
    for (const t of [m.map, m.normalMap, m.roughnessMap, m.aoMap]) {
      t.repeat.set(repeatX, 1);
      t.anisotropy = 8;
      t.needsUpdate = true;
    }
    m.color = new THREE.Color(base);
    m.roughness = 0.5;
    m.metalness = 0.03;
    m.clearcoat = 0.65;
    m.clearcoatRoughness = 0.35;
    m.envMapIntensity = 0.85;
    return m;
  }, [base, repeatX]);
  return <primitive object={mat} attach="material" />;
}

const HARDWARE = { color: "#7E8794", metalness: 0.9, roughness: 0.4, envMapIntensity: 1.2 };

/** A recessed panel: a dark slab set back + a beveled raised frame around it. */
function Panel({ w, h }: { w: number; h: number }) {
  const ring = useMemo(() => {
    const ow = w - 0.06;
    const oh = h - 0.08;
    const r = Math.min(ow, oh) * 0.06;
    const outer = new THREE.Shape();
    outer.moveTo(-ow / 2 + r, -oh / 2);
    outer.lineTo(ow / 2 - r, -oh / 2);
    outer.quadraticCurveTo(ow / 2, -oh / 2, ow / 2, -oh / 2 + r);
    outer.lineTo(ow / 2, oh / 2 - r);
    outer.quadraticCurveTo(ow / 2, oh / 2, ow / 2 - r, oh / 2);
    outer.lineTo(-ow / 2 + r, oh / 2);
    outer.quadraticCurveTo(-ow / 2, oh / 2, -ow / 2, oh / 2 - r);
    outer.lineTo(-ow / 2, -oh / 2 + r);
    outer.quadraticCurveTo(-ow / 2, -oh / 2, -ow / 2 + r, -oh / 2);
    const hole = new THREE.Shape();
    const iw = ow - 0.09;
    const ih = oh - 0.1;
    const r2 = Math.min(iw, ih) * 0.06;
    hole.moveTo(-iw / 2 + r2, -ih / 2);
    hole.lineTo(iw / 2 - r2, -ih / 2);
    hole.quadraticCurveTo(iw / 2, -ih / 2, iw / 2, -ih / 2 + r2);
    hole.lineTo(iw / 2, ih / 2 - r2);
    hole.quadraticCurveTo(iw / 2, ih / 2, iw / 2 - r2, ih / 2);
    hole.lineTo(-iw / 2 + r2, ih / 2);
    hole.quadraticCurveTo(-iw / 2, ih / 2, -iw / 2, ih / 2 - r2);
    hole.lineTo(-iw / 2, -ih / 2 + r2);
    hole.quadraticCurveTo(-iw / 2, -ih / 2, -iw / 2 + r2, -ih / 2);
    outer.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(outer, {
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.012,
      bevelSegments: 2,
      curveSegments: 10,
    });
    geo.translate(0, 0, -TH * 0.14);
    return geo;
  }, [w, h]);

  return (
    <group>
      {/* deep recess */}
      <mesh position={[0, 0, -TH * 0.34]}>
        <boxGeometry args={[w - 0.1, h - 0.12, 0.035]} />
        <WoodMaterial base="#171621" repeatX={Math.max(1, (w - 0.1) / 1.2)} />
      </mesh>
      {/* beveled frame around the recess — catches the key light */}
      <mesh geometry={ring}>
        <WoodMaterial base="#302E38" repeatX={Math.max(1, (w - 0.36) / 1.2)} />
      </mesh>
    </group>
  );
}

/**
 * One door leaf, hinged at its outer edge (this group's origin).
 * Real stile-and-rail construction: outer stile, inner stile, rails,
 * deep recessed panels, manufactured hardware. Everything is rigidly
 * attached to the leaf — no independent part motion.
 */
function DoorLeaf({ side }: { side: "left" | "right" }) {
  const w = LW - 0.02;
  const innerW = w - 0.15 - 0.13;

  const rails = [
    { h: 0.16, y: H - 0.08 },
    { h: 0.2, y: 0.1 },
    { h: 0.15, y: 0.98 },
  ];
  const panels = [
    { h: 0.68, y: 0.57 },
    { h: 1.72, y: 1.9 },
    { h: 0.92, y: 3.42 },
  ];

  return (
    <group position={[side === "left" ? w / 2 : -w / 2, H / 2, 0]}>
      {/* back slab — gives the leaf structural depth so panels read as recessed */}
      <mesh position={[0, 0, -TH * 0.26]}>
        <boxGeometry args={[w, H, 0.03]} />
        <meshStandardMaterial color="#141319" roughness={0.7} metalness={0.05} />
      </mesh>

      {/* outer stile (hinge side) */}
      <mesh position={[side === "left" ? -(w / 2 - 0.075) : w / 2 - 0.075, 0, 0]}>
        <boxGeometry args={[0.15, H, TH]} />
        <WoodMaterial base="#211F2A" repeatX={1.4} />
      </mesh>
      {/* inner stile (handle side) */}
      <mesh position={[side === "left" ? w / 2 - 0.075 : -(w / 2 - 0.075), 0, 0]}>
        <boxGeometry args={[0.15, H, TH]} />
        <WoodMaterial base="#211F2A" repeatX={1.4} />
      </mesh>

      {/* rails */}
      {rails.map((r, i) => (
        <mesh key={i} position={[0, r.y - 0.1, 0]}>
          <boxGeometry args={[w - 0.3, r.h, TH]} />
          <WoodMaterial base="#211F2A" repeatX={2.2} />
        </mesh>
      ))}

      {/* recessed panels */}
      {panels.map((p, i) => (
        <group key={i} position={[0, p.y, 0]}>
          <Panel w={innerW} h={p.h} />
        </group>
      ))}

      {/* handle — assembled hardware on the inner stile */}
      <group position={[side === "left" ? w / 2 - 0.16 : -(w / 2 - 0.16), 1.34, TH * 0.45]}>
        <mesh rotation={[0, 0, side === "left" ? Math.PI / 2 : -Math.PI / 2]} position={[0, 0, 0.01]}>
          <boxGeometry args={[0.1, 0.2, 0.02]} />
          <meshStandardMaterial {...HARDWARE} roughness={0.34} />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <cylinderGeometry args={[0.036, 0.033, 0.03, 20]} />
          <meshStandardMaterial {...HARDWARE} />
        </mesh>
        <mesh position={[0, 0, 0.075]}>
          <cylinderGeometry args={[0.009, 0.009, 0.06, 10]} />
          <meshStandardMaterial {...HARDWARE} roughness={0.26} />
        </mesh>
        <mesh position={[side === "left" ? -0.09 : 0.09, -0.02, 0.1]} rotation={[0, 0, side === "left" ? Math.PI / 2 : -Math.PI / 2]}>
          <cylinderGeometry args={[0.009, 0.009, 0.2, 10]} />
          <meshStandardMaterial {...HARDWARE} roughness={0.26} />
        </mesh>
        <mesh position={[side === "left" ? -0.185 : 0.185, -0.028, 0.102]} rotation={[Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[0.011, 10, 10]} />
          <meshStandardMaterial {...HARDWARE} roughness={0.2} />
        </mesh>
      </group>

      {/* hinges — strap + barrel riding on the outer hinge axis */}
      {[0.9, 2.05, 3.45].map((y) => (
        <group key={y} position={[side === "left" ? -(w / 2) + 0.02 : w / 2 - 0.02, y - 0.05, 0]}>
          <mesh position={[side === "left" ? 0.06 : -0.06, 0, 0]}>
            <boxGeometry args={[0.1, 0.3, 0.045]} />
            <meshStandardMaterial {...HARDWARE} roughness={0.42} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.09, 12]} />
            <meshStandardMaterial {...HARDWARE} roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * The full door assembly — frame + two hinged leaves, plus the interior
 * light sources. Everything is static during idle; only the director
 * animates it (hinge rotation / light / camera).
 */
export function DoorAssembly() {
  const frame = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const interiorGlow = useRef<THREE.Mesh>(null);
  const interiorLight = useRef<THREE.PointLight>(null);
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const handleLight = useRef<THREE.PointLight>(null);
  const glow = useMemo(() => makeGlowTexture("#D6E2F8", "#536FAF"), []);

  const register = () => {
    director.registerRefs({
      frameGroup: frame.current,
      doorLeft: left.current,
      doorRight: right.current,
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
        {/* architrave frame posts */}
        <mesh position={[-W / 2 - 0.09, H / 2, 0]}>
          <boxGeometry args={[0.2, H + 0.5, 0.42]} />
          <WoodMaterial base="#191722" repeatX={1} />
        </mesh>
        <mesh position={[W / 2 + 0.09, H / 2, 0]}>
          <boxGeometry args={[0.2, H + 0.5, 0.42]} />
          <WoodMaterial base="#191722" repeatX={1} />
        </mesh>
        {/* lintel */}
        <mesh position={[0, H + 0.19, 0]}>
          <boxGeometry args={[W + 0.4, 0.24, 0.46]} />
          <WoodMaterial base="#171521" repeatX={1} />
        </mesh>
        {/* threshold */}
        <mesh position={[0, -0.05, 0]}>
          <boxGeometry args={[W + 0.4, 0.12, 0.42]} />
          <WoodMaterial base="#14131B" repeatX={1} />
        </mesh>

        {/* leaves hinged at their true outer edges */}
        <group ref={left} position={[-W / 2, 0, 0]}>
          <DoorLeaf side="left" />
        </group>
        <group ref={right} position={[W / 2, 0, 0]}>
          <DoorLeaf side="right" />
        </group>

        {/* architectural reveal — recessed jambs make the door read as installed */}
        <mesh position={[-LW + 0.02, H / 2 - 0.1, -0.34]}>
          <boxGeometry args={[0.11, H + 0.1, 0.52]} />
          <meshStandardMaterial color="#14161F" roughness={0.9} metalness={0.05} />
        </mesh>
        <mesh position={[LW - 0.02, H / 2 - 0.1, -0.34]}>
          <boxGeometry args={[0.11, H + 0.1, 0.52]} />
          <meshStandardMaterial color="#14161F" roughness={0.9} metalness={0.05} />
        </mesh>
        <mesh position={[0, H - 0.1, -0.31]}>
          <boxGeometry args={[W - 0.1, 0.1, 0.54]} />
          <meshStandardMaterial color="#13151D" roughness={0.95} metalness={0.02} />
        </mesh>
      </group>

      {/* interior glow, visible as the doors part */}
      <mesh ref={interiorGlow} position={[0, H / 2, -0.45]} scale={[W, H, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.14} toneMapped={false} />
      </mesh>
      <mesh position={[0, H / 2, -0.42]} scale={[W * 0.98, H * 0.98, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.05} toneMapped={false} />
      </mesh>

      {/* light leaking from inside */}
      <pointLight ref={interiorLight} position={[0, H / 2, -1.2]} intensity={0} distance={8} color="#8FA8E0" decay={2} />
      {/* soft light on the handles once opening is available */}
      <pointLight ref={handleLight} position={[0, 1.34, 1.1]} intensity={0} distance={2.4} color="#AEB9CC" />

      {/* KEY light — the single dominant source shaping the door */}
      {quality.shadows ? (
        <directionalLight
          ref={keyLight}
          position={[-3.4, 6, 4.6]}
          intensity={0.85}
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
      ) : (
        <directionalLight ref={keyLight} position={[-3.4, 6, 4.6]} intensity={0.85} />
      )}

      {/* soft pool of light beneath the door, grounding the composition */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.35]} scale={[4.2, 2.4, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glow} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.06} toneMapped={false} />
      </mesh>
    </group>
  );
}