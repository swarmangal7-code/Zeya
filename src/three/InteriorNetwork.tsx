import { useMemo } from "react";
import * as THREE from "three";
import { experienceConfig } from "../experience.config";

type RoomLight = "none" | "cool" | "warm";

interface RoomSpec {
  z: number;
  w: number;
  open: number;
  light: RoomLight;
}

/**
 * The multi-room interior network behind the door.
 *
 * A long architectural corridor with rooms on both sides, a branching
 * intersection at the far end (left/right routes + a continuation), ceiling
 * cove lighting, and a slab floor. Rooms are architectural hints — doorways,
 * partial leaves, and faint light leaking from a few of them.
 *
 * Deterministic static geometry only. Floor = y 0, doorway plane = z 0.
 */
export function InteriorNetwork() {
  const cfg = experienceConfig.interior;
  const { startZ, endZ, halfWidth, height } = cfg.corridor;
  const len = endZ - startZ;
  const midZ = (startZ + endZ) / 2;
  const rooms = cfg.rooms as unknown as Record<"left" | "right", RoomSpec[]>;

  const m = useMemo(() => {
    const wall = new THREE.MeshStandardMaterial({ color: "#0D1321", roughness: 0.85, metalness: 0.04, envMapIntensity: 0.3 });
    const wallLift = new THREE.MeshStandardMaterial({ color: "#141B2C", roughness: 0.8, metalness: 0.06, envMapIntensity: 0.35 });
    const ceil = new THREE.MeshStandardMaterial({ color: "#0C1019", roughness: 0.92, metalness: 0.02 });
    const ceilReveal = new THREE.MeshStandardMaterial({ color: "#080B11", roughness: 0.95, metalness: 0.02 });
    const floor = new THREE.MeshStandardMaterial({ color: "#10141E", roughness: 0.62, metalness: 0.12, envMapIntensity: 0.5 });
    const seam = new THREE.MeshStandardMaterial({ color: "#0A0D14", roughness: 0.9, metalness: 0.1 });
    const jamb = new THREE.MeshStandardMaterial({ color: "#151A26", roughness: 0.7, metalness: 0.3, envMapIntensity: 0.5 });
    const leaf = new THREE.MeshStandardMaterial({ color: "#1A1F2C", roughness: 0.6, metalness: 0.55, envMapIntensity: 0.6 });
    const voidMat = new THREE.MeshStandardMaterial({ color: "#070A11", roughness: 0.95, metalness: 0.02 });
    const roomWall = new THREE.MeshStandardMaterial({ color: "#0B0F18", roughness: 0.9, metalness: 0.04 });
    const cove = new THREE.MeshBasicMaterial({ color: "#C9D6F2", transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
    const farGlow = new THREE.MeshBasicMaterial({ color: "#9FB4DD", transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false });
    return { wall, wallLift, ceil, ceilReveal, floor, seam, jamb, leaf, voidMat, roomWall, cove, farGlow };
  }, []);

  const R = {
    wall: { ...m.wall } as THREE.MeshStandardMaterial,
    wallLift: { ...m.wallLift } as THREE.MeshStandardMaterial,
    ceil: { ...m.ceil } as THREE.MeshStandardMaterial,
    ceilReveal: { ...m.ceilReveal } as THREE.MeshStandardMaterial,
    floor: { ...m.floor } as THREE.MeshStandardMaterial,
    seam: { ...m.seam } as THREE.MeshStandardMaterial,
    jamb: { ...m.jamb } as THREE.MeshStandardMaterial,
    leaf: { ...m.leaf } as THREE.MeshStandardMaterial,
    voidMat: { ...m.voidMat } as THREE.MeshStandardMaterial,
    roomWall: { ...m.roomWall } as THREE.MeshStandardMaterial,
  };

  const buildSide = (side: "left" | "right") =>
    rooms[side].map((r: RoomSpec, i: number) => {
      const dir = side === "left" ? -1 : 1;
      const wallX = side === "left" ? -halfWidth : halfWidth;
      const z0 = r.z - r.w / 2;
      const rot = side === "left" ? 1.5 : -1.5;
      const openAngle = r.open * (side === "left" ? -0.85 : 0.85);
      const lightColor = r.light === "warm" ? "#E8D6B8" : "#9FB4DD";
      const lightOpacity = r.open > 0.2 ? 0.28 : 0.1;
      return (
        <group key={side + i}>
          {/* doorway darkness, proud of the wall so the opening reads */}
          <mesh position={[wallX + dir * 0.05, 1.05, r.z]} rotation-y={rot}>
            <planeGeometry args={[r.w, 2.1]} />
            <meshStandardMaterial {...(R.voidMat as THREE.MeshStandardMaterial)} />
          </mesh>
          {/* jambs */}
          <mesh position={[wallX + dir * 0.03, 1.05, z0]}>
            <boxGeometry args={[0.1, 2.1, 0.1]} />
            <meshStandardMaterial {...(R.jamb as THREE.MeshStandardMaterial)} />
          </mesh>
          <mesh position={[wallX + dir * 0.03, 1.05, r.z + r.w / 2]}>
            <boxGeometry args={[0.1, 2.1, 0.1]} />
            <meshStandardMaterial {...(R.jamb as THREE.MeshStandardMaterial)} />
          </mesh>
          {/* lintel */}
          <mesh position={[wallX + dir * 0.05, 2.15, r.z]}>
            <boxGeometry args={[0.12, 0.1, r.w]} />
            <meshStandardMaterial {...(R.jamb as THREE.MeshStandardMaterial)} />
          </mesh>
          {/* door leaf, hinged — some closed, some partly open */}
          <group position={[wallX + dir * 0.06, 1.05, z0]} rotation-y={openAngle}>
            <mesh position={[0, 0, r.w / 2]}>
              <boxGeometry args={[0.05, 2.0, r.w]} />
              <meshStandardMaterial {...(R.leaf as THREE.MeshStandardMaterial)} />
            </mesh>
          </group>
          {/* room cavity with a hint of depth */}
          <mesh position={[wallX + dir * 1.15, 1.05, r.z]} rotation-y={rot}>
            <planeGeometry args={[r.w + 0.15, 2.15]} />
            <meshStandardMaterial {...(R.roomWall as THREE.MeshStandardMaterial)} />
          </mesh>
          <mesh position={[wallX + dir * 0.7, 0.01, r.z]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[r.w + 0.4, 1.6]} />
            <meshStandardMaterial {...(R.floor as THREE.MeshStandardMaterial)} />
          </mesh>
          {/* faint architectural light inside selected rooms */}
          {r.light !== "none" && (
            <mesh position={[wallX + dir * 1.1, 1.25, r.z]}>
              <planeGeometry args={[r.w * 0.45, 0.5]} />
              <meshBasicMaterial color={lightColor} transparent opacity={lightOpacity} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
          )}
          {/* desk silhouette in one open cool room */}
          {r.light === "cool" && r.open > 0.5 && (
            <mesh position={[wallX + dir * 1.0, 0.36, r.z]}>
              <boxGeometry args={[r.w * 0.55, 0.72, 0.42]} />
              <meshStandardMaterial color="#141927" roughness={0.8} />
            </mesh>
          )}
        </group>
      );
    });

  return (
    <group name="interior-network">
      {/* ---------- corridor walls ---------- */}
      <mesh position={[-halfWidth, height / 2, midZ]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[len, height]} />
        <meshStandardMaterial {...(R.wall as THREE.MeshStandardMaterial)} />
      </mesh>
      <mesh position={[halfWidth, height / 2, midZ]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[len, height]} />
        <meshStandardMaterial {...(R.wall as THREE.MeshStandardMaterial)} />
      </mesh>

      {/* wall rhythm — vertical pilaster strips both sides */}
      {Array.from({ length: Math.floor(len / 3.4) }).map((_, i) => {
        const z = startZ + 1.7 + i * 3.4;
        return (
          <group key={i}>
            <mesh position={[-halfWidth + 0.02, 1.9, z]}>
              <boxGeometry args={[0.16, 3.8, 0.1]} />
              <meshStandardMaterial {...(R.wallLift as THREE.MeshStandardMaterial)} />
            </mesh>
            <mesh position={[halfWidth - 0.02, 1.9, z]}>
              <boxGeometry args={[0.16, 3.8, 0.1]} />
              <meshStandardMaterial {...(R.wallLift as THREE.MeshStandardMaterial)} />
            </mesh>
          </group>
        );
      })}

      {/* ---------- ceiling with recessed cove lighting ---------- */}
      <mesh position={[0, height, midZ]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[len, halfWidth * 2]} />
        <meshStandardMaterial {...(R.ceil as THREE.MeshStandardMaterial)} />
      </mesh>
      {[-1.15, 1.15].map((x) => (
        <group key={x}>
          <mesh position={[x, height - 0.05, midZ]}>
            <boxGeometry args={[0.34, 0.12, len - 0.4]} />
            <meshStandardMaterial {...(R.ceilReveal as THREE.MeshStandardMaterial)} />
          </mesh>
          <mesh position={[x, height - 0.07, midZ]} rotation-x={Math.PI / 2}>
            <planeGeometry args={[len - 0.8, 0.14]} />
            <meshBasicMaterial {...m.cove} />
          </mesh>
        </group>
      ))}

      {/* ---------- corridor floor ---------- */}
      <mesh position={[0, 0.001, midZ]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[halfWidth * 2, len]} />
        <meshStandardMaterial {...(R.floor as THREE.MeshStandardMaterial)} />
      </mesh>
      {Array.from({ length: Math.floor(len / 3) - 1 }).map((_, i) => {
        const z = startZ + 3 + i * 3;
        return (
          <mesh key={i} position={[0, 0.004, z]} rotation-x={-Math.PI / 2}>
            <planeGeometry args={[halfWidth * 2, 0.06]} />
            <meshStandardMaterial {...(R.seam as THREE.MeshStandardMaterial)} />
          </mesh>
        );
      })}

      {/* ---------- side rooms ---------- */}
      {buildSide("left")}
      {buildSide("right")}

      {/* ---------- far intersection: branches + continuation ---------- */}
      <mesh position={[0, height / 2, endZ]} rotation-y={0}>
        <planeGeometry args={[halfWidth * 2, height]} />
        <meshStandardMaterial {...(R.wall as THREE.MeshStandardMaterial)} />
      </mesh>
      {/* forward continuation doorway */}
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, 1.3, endZ + 0.03]}>
          <boxGeometry args={[0.14, 2.6, 0.16]} />
          <meshStandardMaterial {...(R.jamb as THREE.MeshStandardMaterial)} />
        </mesh>
      ))}
      <mesh position={[0, 2.82, endZ + 0.03]}>
        <boxGeometry args={[2.4, 0.14, 0.2]} />
        <meshStandardMaterial {...(R.jamb as THREE.MeshStandardMaterial)} />
      </mesh>
      {/* continuation corridor floor + a distant, secondary light */}
      <mesh position={[0, 0.001, endZ - 3.4]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[4, 7]} />
        <meshStandardMaterial {...(R.floor as THREE.MeshStandardMaterial)} />
      </mesh>
      {[-2.05, 2.05].map((x) => (
        <mesh key={x} position={[x, 1.6, endZ - 3.4]} rotation-y={x < 0 ? Math.PI / 2 : -Math.PI / 2}>
          <planeGeometry args={[7, 3.2]} />
          <meshStandardMaterial {...(R.roomWall as THREE.MeshStandardMaterial)} />
        </mesh>
      ))}
      <mesh position={[0, 1.6, endZ - 6.6]}>
        <planeGeometry args={[4.1, 3.2]} />
        <meshStandardMaterial {...(R.wall as THREE.MeshStandardMaterial)} />
      </mesh>
      <mesh position={[0, 1.7, endZ - 6.25]}>
        <planeGeometry args={[2.2, 2.0]} />
        <meshBasicMaterial {...m.farGlow} />
      </mesh>

      {/* branch openings at the intersection */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * halfWidth + s * 0.05, 1.1, endZ - 0.6]} rotation-y={s === -1 ? 1.5 : -1.5}>
            <planeGeometry args={[1.5, 2.1]} />
            <meshStandardMaterial {...(R.voidMat as THREE.MeshStandardMaterial)} />
          </mesh>
          <mesh position={[s * halfWidth + s * 1.6, 1.2, endZ - 1.2]} rotation-y={s === -1 ? 1.5 : -1.5}>
            <planeGeometry args={[1.5, 2.1]} />
            <meshStandardMaterial {...(R.roomWall as THREE.MeshStandardMaterial)} />
          </mesh>
          <mesh position={[s * halfWidth + s * 1.5, 1.4, endZ - 0.9]}>
            <planeGeometry args={[0.6, 0.5]} />
            <meshBasicMaterial color="#8EA6D6" transparent opacity={0.08} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
      ))}

      {/* interior architectural light — cool white down the corridor, indigo at the junction */}
      <pointLight position={[0, 3.4, -8.5]} intensity={4.5} distance={11} color="#C9D6F2" decay={2} />
      <pointLight position={[0, 3.4, -15.5]} intensity={4} distance={11} color="#B9C7E0" decay={2} />
      <pointLight position={[0, 2.6, -24]} intensity={4} distance={13} color="#6E6AA8" decay={2} />
    </group>
  );
}