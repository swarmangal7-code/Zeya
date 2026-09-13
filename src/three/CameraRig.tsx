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

    const d = 1 - Math.exp(-dt * 3.4);
    const t2 = state.clock.elapsedTime;
    const motion = prefersReducedMotion ? 0.15 : 1;
    const cinematic = director.cinematicMode !== "normal";

    // fit the door for the current aspect ratio (free camera only)
    if (!cinematic) {
      const fovR = (director.fovTarget * Math.PI) / 180;
      const t = Math.tan(fovR / 2);
      const aspect = state.size.width / state.size.height;
      const fit = Math.max(fitHalfV / t, fitHalfW / (t * aspect));
      if (Math.abs(fit - director.fitZ) > 0.02) {
        director.fitZ = fit;
        director.adoptFitZ();
      }
    }

    director.drainImpulse(dt);
    const c = director.camTarget;
    // idle life is suspended while a scripted sequence owns the camera
    const breathY = cinematic ? 0 : Math.sin(t2 * 0.35) * 0.015 * motion;
    const breathZ = cinematic ? 0 : Math.cos(t2 * 0.27) * 0.007 * motion;
    const px = cinematic ? 0 : director.mouse.x * 0.045 * motion;
    const py = cinematic ? 0 : director.mouse.y * 0.028 * motion;
    const pushIn = cinematic ? 0 : Math.min(t2 * 0.006, 0.18) * motion;

    const tx = c.x + px + director.impulse.x * (cinematic ? 0.2 : 0.4);
    const ty = c.y + py + breathY + director.impulse.y * (cinematic ? 0.2 : 0.4);
    const tz = c.z - pushIn + breathZ;

    // depth of field as storytelling: ease toward the director's focus targets
    const de = director.dofEffect;
    if (de) {
      const k = prefersReducedMotion ? 0 : 1 - Math.exp(-dt * 2.2);
      if (k > 0) {
        de.focusDistance += (director.dofFocus - de.focusDistance) * k;
        de.bokehScale += (director.dofBokeh - de.bokehScale) * k;
        const fl = experienceConfig.postprocessing.dof.focalLength;
        de.focalLength += (fl - de.focalLength) * k;
      }
    }

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