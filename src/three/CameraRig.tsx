import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { director } from "../director";
import { experienceConfig } from "../experience.config";
import { prefersReducedMotion } from "../lib/quality";

const { fitHalfW, fitHalfV } = experienceConfig.camera;

/**
 * Cinematic camera. Smoothly approaches the director's target, adds a faint
 * idle breath and pointer parallax, decays knock impulses. Driven by lerp —
 * no React re-renders. Keeps the door framed edge-to-edge on any viewport.
 */
export function CameraRig() {
  useFrame((state, dt) => {
    const cam = state.camera;
    if (!(cam instanceof THREE.PerspectiveCamera)) return;

    // fit the door for the current aspect ratio
    const fovR = (director.fovTarget * Math.PI) / 180;
    const t = Math.tan(fovR / 2);
    const aspect = state.size.width / state.size.height;
    const fit = Math.max(fitHalfV / t, fitHalfW / (t * aspect));
    if (Math.abs(fit - director.fitZ) > 0.02) {
      director.fitZ = fit;
      director.adoptFitZ();
    }

    const d = 1 - Math.exp(-dt * 3.4);
    const t2 = state.clock.elapsedTime;
    const motion = prefersReducedMotion ? 0.15 : 1;

    director.drainImpulse(dt);
    const c = director.camTarget;
    const breathY = Math.sin(t2 * 0.35) * 0.015 * motion;
    const breathZ = Math.cos(t2 * 0.27) * 0.007 * motion;
    const px = director.mouse.x * 0.045 * motion;
    const py = director.mouse.y * 0.028 * motion;

    const tx = c.x + px + director.impulse.x * 0.4;
    const ty = c.y + py + breathY + director.impulse.y * 0.4;
    const tz = c.z + breathZ;

    cam.position.x += (tx - cam.position.x) * d;
    cam.position.y += (ty - cam.position.y) * d;
    cam.position.z += (tz - cam.position.z) * d;
    cam.lookAt(director.camLook.x, director.camLook.y, director.camLook.z);

    if (Math.abs(cam.fov - director.fovTarget) > 0.02) {
      cam.fov += (director.fovTarget - cam.fov) * d;
      cam.updateProjectionMatrix();
    }
  });
  return null;
}