import { useMemo } from "react";
import * as THREE from "three";

/**
 * The architectural vestibule the door is installed into.
 *
 * Floor = y 0, doorway plane = z 0, opening x ∈ [-1.75, 1.75], door top ≈ 4.3.
 * The environment frames the door and gives the space real depth layers:
 *
 *   doorway → threshold → vestibule → corridor → distant recessed light
 *
 * Everything is static geometry (deterministic, no particles, no motion).
 * Materials are created once and shared.
 */
export function ArchitecturalEnvironment() {
  const m = useMemo(() => {
    const wall = new THREE.MeshStandardMaterial({ color: "#0C101A", roughness: 0.85, metalness: 0.05, envMapIntensity: 0.3 });
    const wallLift = new THREE.MeshStandardMaterial({ color: "#121724", roughness: 0.8, metalness: 0.05, envMapIntensity: 0.35 });
    const panelDark = new THREE.MeshStandardMaterial({ color: "#0A0E17", roughness: 0.9, metalness: 0.05 });
    const panelLift = new THREE.MeshStandardMaterial({ color: "#151A27", roughness: 0.8, metalness: 0.05, envMapIntensity: 0.3 });
    const ceil = new THREE.MeshStandardMaterial({ color: "#0D111B", roughness: 0.92, metalness: 0.03 });
    const ceilReveal = new THREE.MeshStandardMaterial({ color: "#080B12", roughness: 0.95, metalness: 0.02 });
    const floorA = new THREE.MeshStandardMaterial({ color: "#0E121C", roughness: 0.68, metalness: 0.12, envMapIntensity: 0.5 });
    const floorB = new THREE.MeshStandardMaterial({ color: "#0D1119", roughness: 0.7, metalness: 0.12, envMapIntensity: 0.5 });
    const floorC = new THREE.MeshStandardMaterial({ color: "#10141F", roughness: 0.66, metalness: 0.12, envMapIntensity: 0.5 });
    const seam = new THREE.MeshStandardMaterial({ color: "#080B11", roughness: 0.9, metalness: 0.1 });
    const threshold = new THREE.MeshStandardMaterial({ color: "#171B25", roughness: 0.58, metalness: 0.35, envMapIntensity: 0.6 });
    const metal = new THREE.MeshStandardMaterial({ color: "#20262F", roughness: 0.5, metalness: 0.85, envMapIntensity: 0.8 });
    const interior = new THREE.MeshStandardMaterial({ color: "#0A0E19", roughness: 0.92, metalness: 0.04 });
    const interiorLift = new THREE.MeshStandardMaterial({ color: "#0D1321", roughness: 0.88, metalness: 0.05 });
    const emissive = new THREE.MeshBasicMaterial({ color: "#AFC2E8", transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
    const emissiveRoom = new THREE.MeshStandardMaterial({ color: "#DCE5F8", emissive: "#8FA8E0", emissiveIntensity: 0.55, roughness: 0.7 });
    return { wall, wallLift, panelDark, panelLift, ceil, ceilReveal, floorA, floorB, floorC, seam, threshold, metal, interior, interiorLift, emissive, emissiveRoom };
  }, []);

  const recessedPanels = [
    { x: -6.1, y: 4.4 },
    { x: -6.1, y: 1.5 },
    { x: 6.1, y: 4.4 },
    { x: 6.1, y: 1.5 },
  ];

  const slabs = [
    { x: -5.6, mat: m.floorB },
    { x: 0, mat: m.floorA },
    { x: 5.6, mat: m.floorC },
  ];

  return (
    <group name="architectural-environment">
      {/* ---------- main back wall (behind the door plane) ---------- */}
      <mesh position={[0, 4, -0.55]}>
        <planeGeometry args={[26, 8.2]} />
        <meshStandardMaterial {...(m.wall as THREE.MeshStandardMaterial)} />
      </mesh>
      <mesh position={[0, 0.14, -0.5]}>
        <boxGeometry args={[26, 0.28, 0.05]} />
        <meshStandardMaterial {...(m.wallLift as THREE.MeshStandardMaterial)} />
      </mesh>
      <mesh position={[0, 7.12, -0.5]}>
        <boxGeometry args={[26, 0.12, 0.06]} />
        <meshStandardMaterial {...(m.wallLift as THREE.MeshStandardMaterial)} />
      </mesh>

      {/* pilasters framing the doorway — give edges real thickness */}
      {[-2.6, 2.6].map((x) => (
        <mesh key={x} position={[x, 3.65, -0.28]}>
          <boxGeometry args={[1.1, 7.3, 0.56]} />
          <meshStandardMaterial {...(m.wallLift as THREE.MeshStandardMaterial)} />
        </mesh>
      ))}

      {/* recessed wall panels with bevel frames */}
      {recessedPanels.map((p, i) => (
        <group key={i} position={[p.x, p.y, 0]}>
          <mesh position={[0, 0, -0.62]}>
            <boxGeometry args={[2.5, 2.5, 0.05]} />
            <meshStandardMaterial {...(m.panelDark as THREE.MeshStandardMaterial)} />
          </mesh>
          {[[0, 1.27, 2.5, 0.07, 0], [0, -1.27, 2.5, 0.07, 0], [1.27, 0, 0.07, 2.5, Math.PI / 2], [-1.27, 0, 0.07, 2.5, Math.PI / 2]].map(([bx, by, bw, bh, r], k) => (
            <mesh key={k} position={[bx, by, -0.55]} rotation={[0, 0, r as number]}>
              <boxGeometry args={[bw as number, bh as number, 0.03]} />
              <meshStandardMaterial {...(m.panelLift as THREE.MeshStandardMaterial)} />
            </mesh>
          ))}
        </group>
      ))}

      {/* narrow vertical light reveals, felt not noticed */}
      {[-2.15, 2.15].map((x) => (
        <mesh key={x} position={[x, 3.5, -0.5]}>
          <planeGeometry args={[0.06, 4.4]} />
          <meshBasicMaterial {...m.emissive} />
        </mesh>
      ))}

      {/* ---------- ceiling + recessed cove above the door ---------- */}
      <mesh position={[0, 7.6, 0.5]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[27, 12]} />
        <meshStandardMaterial {...(m.ceil as THREE.MeshStandardMaterial)} />
      </mesh>
      <mesh position={[0, 7.28, -0.1]}>
        <boxGeometry args={[4.4, 0.32, 1.6]} />
        <meshStandardMaterial {...(m.ceilReveal as THREE.MeshStandardMaterial)} />
      </mesh>
      {/* perceived overhead illumination from inside the cove */}
      <mesh position={[0, 7.32, -0.1]}>
        <planeGeometry args={[3.4, 1.1]} />
        <meshBasicMaterial {...m.emissive} />
      </mesh>

      {/* ---------- floor: graphite slabs with seams ---------- */}
      <mesh position={[0, 0, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial {...(m.floorA as THREE.MeshStandardMaterial)} />
      </mesh>
      {slabs.map((s) => (
        <mesh key={s.x} position={[0, 0.008, s.x]} rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[11.2, 16]} />
          <primitive object={s.mat} attach="material" />
        </mesh>
      ))}
      <mesh position={[0, 0.01, -1.5]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[30, 0.5]} />
        <meshStandardMaterial {...(m.seam as THREE.MeshStandardMaterial)} />
      </mesh>
      <mesh position={[0, 0.01, 2.5]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[30, 0.5]} />
        <meshStandardMaterial {...(m.seam as THREE.MeshStandardMaterial)} />
      </mesh>

      {/* ---------- threshold slab + recess line ---------- */}
      <mesh position={[0, 0.035, 0.12]}>
        <boxGeometry args={[4.0, 0.07, 0.3]} />
        <meshStandardMaterial {...(m.threshold as THREE.MeshStandardMaterial)} />
      </mesh>
      <mesh position={[0, 0.012, -0.02]}>
        <boxGeometry args={[4.0, 0.024, 0.22]} />
        <meshStandardMaterial {...(m.metal as THREE.MeshStandardMaterial)} />
      </mesh>

      {/* ---------- vestibule behind the door ---------- */}
      {[-2.6, 2.6].map((x) => (
        <mesh key={`v${x}`} position={[x, 2.1, -2.1]} rotation-y={x < 0 ? Math.PI / 2 : -Math.PI / 2}>
          <planeGeometry args={[3.4, 4.2]} />
          <meshStandardMaterial {...(m.interior as THREE.MeshStandardMaterial)} />
        </mesh>
      ))}
      <mesh position={[0, 4.12, -2.1]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[5.2, 3.4]} />
        <meshStandardMaterial {...(m.interior as THREE.MeshStandardMaterial)} />
      </mesh>
      {/* inner jamb edge that reads as the doorway's thickness */}
      {[-1.9, 1.9].map((x) => (
        <mesh key={`j${x}`} position={[x, 2.1, -0.62]}>
          <boxGeometry args={[0.14, 4.3, 0.18]} />
          <meshStandardMaterial {...(m.metal as THREE.MeshStandardMaterial)} />
        </mesh>
      ))}

      {/* corridor interior is built by InteriorNetwork */}
    </group>
  );
}