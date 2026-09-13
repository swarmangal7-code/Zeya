import * as THREE from "three";
import gsap from "gsap";
import { experienceConfig } from "./experience.config";
import { prefersReducedMotion } from "./lib/quality";
import type { CameraMode } from "./types";

/**
 * Non-reactive scene director. Holds refs to 3D objects and drives
 * animations through GSAP, bypassing React re-renders entirely.
 * Components register their refs; nothing in here triggers React state.
 */
class Director {
  camera: THREE.PerspectiveCamera | null = null;

  /** base position the camera lerps toward every frame */
  camTarget = {
    x: 0,
    y: experienceConfig.camera.idleY,
    z: 6.8,
  };
  camLook = { x: 0, y: experienceConfig.camera.lookY, z: 0 };
  /** distance that frames the door fully for the current viewport */
  fitZ = 6.8;
  doorOpenInitiated = false;
  impulse = { x: 0, y: 0 };
  fovTarget = experienceConfig.camera.fov;
  mouse = { x: 0, y: 0 };

  doorLeft: THREE.Group | null = null;
  doorRight: THREE.Group | null = null;
  frameGroup: THREE.Group | null = null;
  dust: THREE.Points | null = null;
  interiorGlow: THREE.Mesh | null = null;
  interiorLight: THREE.PointLight | null = null;
  keyLight: THREE.DirectionalLight | null = null;
  revealFog: THREE.Fog | null = null;
  handleLight: THREE.PointLight | null = null;

  doorOpenAmount = 0;
  /** DepthOfField storytelling targets (lerped by CameraRig) */
  dofFocus = experienceConfig.postprocessing.dof.focusDistance;
  dofBokeh = experienceConfig.postprocessing.dof.bokehScale;
  dofEffect: {
    focusDistance: number;
    bokehScale: number;
    focalLength: number;
  } | null = null;

  private knocked = false;

  /* ------------------------------------------------------------------ */
  /* Registration                                                       */
  /* ------------------------------------------------------------------ */

  registerCamera(cam: THREE.PerspectiveCamera): void {
    this.camera = cam;
  }

  registerRefs(refs: {
    doorLeft?: THREE.Group | null;
    doorRight?: THREE.Group | null;
    frameGroup?: THREE.Group | null;
    dust?: THREE.Points | null;
    interiorGlow?: THREE.Mesh | null;
    interiorLight?: THREE.PointLight | null;
    keyLight?: THREE.DirectionalLight | null;
    handleLight?: THREE.PointLight | null;
    revealFog?: THREE.Fog | null;
    dofEffect?: {
      focusDistance: number;
      bokehScale: number;
      focalLength: number;
    } | null;
  }): void {
    if (refs.doorLeft) this.doorLeft = refs.doorLeft;
    if (refs.doorRight) this.doorRight = refs.doorRight;
    if (refs.frameGroup) this.frameGroup = refs.frameGroup;
    if (refs.dust) this.dust = refs.dust;
    if (refs.interiorGlow) this.interiorGlow = refs.interiorGlow;
    if (refs.interiorLight) this.interiorLight = refs.interiorLight;
    if (refs.keyLight) this.keyLight = refs.keyLight;
    if (refs.handleLight) this.handleLight = refs.handleLight;
    if (refs.revealFog) this.revealFog = refs.revealFog;
    if (refs.dofEffect) this.dofEffect = refs.dofEffect;
  }

  /** Adopt a framing distance that fits the door for the current viewport. */
  adoptFitZ(): void {
    if (this.doorOpenInitiated) return;
    if (Math.abs(this.fitZ - this.camTarget.z) > 0.04) {
      gsap.to(this.camTarget, { z: this.fitZ, duration: 0.7, ease: "power1.out", overwrite: true });
    }
  }

  setStartDoor(): void {
    gsap.set(this.camTarget, { x: 0, y: experienceConfig.camera.idleY, z: this.fitZ });
    gsap.set(this.camLook, { x: 0, y: experienceConfig.camera.lookY, z: 0 });
    this.fovTarget = experienceConfig.camera.fov;
    this.doorOpenInitiated = false;
  }

  onPointerMove(x: number, y: number): void {
    this.mouse.x = x;
    this.mouse.y = y;
  }

  /**
   * STATE A→B — the door arrives near-dark and is slowly "found" by the
   * key light. Gradual, never a brightness jump.
   */
  approachDoor(): void {
    if (!this.keyLight) return;
    gsap.fromTo(this.keyLight, { intensity: 0.14 }, { intensity: 0.62, duration: 4.6, ease: "power2.out", overwrite: true });
  }

  /** The handle catches a faint highlight once interaction is offered. */
  lightHandle(): void {
    if (!this.handleLight) return;
    gsap.to(this.handleLight, { intensity: 1.4, duration: 1.8, ease: "power2.out", overwrite: true });
  }

  /* ------------------------------------------------------------------ */
  /* Knock                                                              */
  /* ------------------------------------------------------------------ */

  applyKnock(variant: 1 | 2): void {
    if (!this.knocked) {
      this.knocked = true;
      this.fovTarget = experienceConfig.camera.fov;
    }
    const door = variant === 1 ? this.doorLeft : this.doorRight;
    if (!door) return;
    // knock #2 lands harder and closer
    const s = variant === 2 ? 1.55 : 1;
    const dir = variant === 1 ? 1 : -1;

    // physical door response — a quick believable impulse, not a shake
    gsap.fromTo(door.rotation, { y: door.rotation.y }, {
      y: door.rotation.y + dir * 0.02 * s,
      duration: 0.08,
      ease: "power2.out",
      yoyo: true,
      repeat: 2,
      onComplete: () => gsap.to(door.rotation, { y: 0, duration: 0.6 * (1 + s * 0.2), ease: "elastic.out(1, 0.32)" }),
    });

    // frame transmission
    if (this.frameGroup) {
      gsap.fromTo(this.frameGroup.position, { x: 0 }, {
        x: dir * 0.006 * s,
        duration: 0.06,
        yoyo: true,
        repeat: 1,
        ease: "none",
        onComplete: () => gsap.to(this.frameGroup!.position, { x: 0, duration: 0.35 }),
      });
    }

    // camera impulse — barely anything, the source is the door
    this.impulse.x += dir * (variant === 1 ? 0.055 : 0.075);
    this.impulse.y += variant === 1 ? 0.025 : 0.04;

    // lighting catches the blow
    if (this.keyLight) {
      const base = this.keyLight.intensity;
      gsap.fromTo(this.keyLight, { intensity: base }, {
        intensity: base + 0.06 * s,
        duration: 0.06,
        yoyo: true,
        repeat: 2,
        onComplete: () => gsap.to(this.keyLight!, { intensity: base, duration: 0.3 }),
      });
    }

    // dust startled subtly
    if (this.dust) {
      gsap.fromTo(this.dust.position, { x: 0 }, { x: 0.03 * s, duration: 0.12, yoyo: true, repeat: 1, onComplete: () => gsap.to(this.dust!.position, { x: 0, duration: 0.6 }) });
    }
  }

  /** Catch the decaying camera impulse each frame. */
  drainImpulse(dt: number): void {
    const d = Math.min(1, (dt ?? 0.016) * 6);
    this.impulse.x *= 1 - d;
    this.impulse.y *= 1 - d;
  }

  /* ------------------------------------------------------------------ */
  /* Camera modes                                                        */
  /* ------------------------------------------------------------------ */

  cinematicMode: CameraMode = "normal";

  /**
   * The cinematic controller owns the camera while a scripted sequence runs.
   * During "normal" CameraRig applies parallax/breathing/push-in; during any
   * cinematic mode it only approaches the scripted camTarget/camLook.
   */
  setCameraMode(mode: CameraMode): void {
    this.cinematicMode = mode;
  }

  /* ------------------------------------------------------------------ */
  /* Opening                                                            */
  /* ------------------------------------------------------------------ */

  /**
   * The door swings around its true hinges while the camera stays at eye
   * level — a shallow push forward, a gentle look into the interior, no
   * downward dive. onDone fires when the door is FULLY open.
   */
  openDoor(onDone?: () => void): void {
    this.doorOpenInitiated = true;
    this.setCameraMode("door_opening");
    const total = experienceConfig.timings.opening.total / 1000;
    const tl = gsap.timeline();

    // door swings — slow, physical-feeling inertia
    if (this.doorLeft) {
      tl.to(this.doorLeft.rotation, { y: 1.92, duration: total, ease: "power2.inOut" }, 0);
    }
    if (this.doorRight) {
      tl.to(this.doorRight.rotation, { y: -1.92, duration: total, ease: "power2.inOut" }, 0);
    }

    // interior at first stays almost black, then cool light gives way
    if (this.interiorGlow) {
      tl.fromTo(this.interiorGlow.material,
        { opacity: 0.16 },
        { opacity: 0.55, duration: total * 0.5, ease: "power2.out" },
        0.9,
      );
    }
    if (this.interiorLight) {
      tl.fromTo(this.interiorLight, { intensity: 0 }, { intensity: 26, duration: total * 0.5, ease: "power2.out" }, 1.1);
    }

    // camera: remains near eye height, tiny forward push, threshold in view
    tl.to(this.camTarget, { z: 2.7, x: 0, duration: total * 0.8, ease: "power2.inOut" }, 0.8)
      .to(this.camTarget, { y: 1.0, duration: total * 0.8, ease: "power2.inOut" }, 0.8)
      .to(this, { fovTarget: 46, duration: total * 0.8, ease: "power2.inOut" }, 0.8)
      .to(this.camLook, { y: 1.95, z: -2.4, duration: total * 0.8, ease: "power2.inOut" }, 0.8);

    // interior assumes the light as the frame settles
    if (this.keyLight) {
      tl.fromTo(this.keyLight, { intensity: 0.5 }, { intensity: 1.05, duration: total * 0.4, ease: "power2.out" }, 1.0);
    }
    if (this.handleLight) {
      tl.to(this.handleLight, { intensity: 0, duration: 1.0 }, 0);
    }
    if (this.revealFog) {
      tl.to(this.revealFog, { near: 0.2, far: 8.5, duration: total, ease: "power1.inOut" }, 0.4);
    }

    const revealAt = experienceConfig.timings.opening.revealAt * total;
    // shallow DOF handoff: door → threshold
    tl.to(this, { dofFocus: 0.24, dofBokeh: 1.35, duration: total * 0.5, ease: "power2.inOut" }, revealAt + 0.2);

    tl.call(() => onDone?.(), undefined, total * 0.92);
  }

  /* ------------------------------------------------------------------ */
  /* STEP INSIDE — physically walking through the doorway                */
  /* ------------------------------------------------------------------ */

  /**
   * The camera lifts toward eye level, looks into the interior, then moves
   * forward through the doorway. The door stays mounted; geometry simply
   * leaves the frame as the camera passes.
   *
   * onEntered fires once the threshold has been crossed (interior in view),
   * onSettled when the entering pose is complete.
   */
  enterDoor(onEntered?: () => void, onSettled?: () => void): void {
    this.doorOpenInitiated = true;
    this.setCameraMode("entering");
    const tl = gsap.timeline();
    const reduce = prefersReducedMotion;

    if (reduce) {
      gsap.set(this.camTarget, { y: 1.5, z: -5.2, x: 0 });
      gsap.set(this.camLook, { y: 1.9, z: -9, x: 0 });
      gsap.set(this, { fovTarget: 51 });
      this.setCameraMode("interior");
      this.tintInteriorLight(0.85);
      if (this.keyLight) gsap.to(this.keyLight, { intensity: 0.4, duration: 1 });
      onEntered?.();
      onSettled?.();
      return;
    }

    // ENTER 1 — lift
    tl.to(this.camTarget, { y: 1.5, z: 0.5, duration: 0.9, ease: "power2.inOut" }, 0)
      // ENTER 2 — look forward into the interior
      .to(this.camLook, { y: 2.0, z: -6, duration: 0.9, ease: "power2.inOut" }, 0.15)
      .to(this, { fovTarget: 49, duration: 1.2, ease: "power2.inOut" }, 0.2)
      // ENTER 3 — forward, through the doorway
      .to(this.camTarget, { y: 1.55, z: -5.4, duration: 1.3, ease: "power2.inOut" }, 0.75)
      .to(this.camLook, { y: 1.9, z: -9, duration: 1.3, ease: "power2.inOut" }, 0.75)
      .to(this, { dofFocus: 0.32, dofBokeh: 1.5, duration: 1.4, ease: "power2.inOut" }, 0.9)
      .to(this, { fovTarget: 51, duration: 1.1, ease: "power2.inOut" }, 1.1);

    // blue interior spill shifts toward cool white as we cross
    tl.call(() => this.tintInteriorLight(0.7), undefined, 0.55);
    tl.call(() => this.tintInteriorLight(1), undefined, 1.25);

    // room key yields to the interior
    if (this.keyLight) tl.to(this.keyLight, { intensity: 0.4, duration: 1.2 }, 0.6);

    tl.call(() => {
      this.setCameraMode("interior");
      onEntered?.();
    }, undefined, 0.85);
    tl.call(() => onSettled?.(), undefined, 2.0);
  }

  /** Progression of the interior light toward cool white (0..1). */
  tintInteriorLight(p: number): void {
    if (!this.interiorLight) return;
    const c = this.interiorLight.color;
    // #8FA8E0 → #D6E2F8
    gsap.to(c, { r: 0.84 + 0.13 * p, g: 0.66 + 0.16 * p, b: 0.88 + 0.11 * p, duration: 0.6, overwrite: true });
  }

  /**
   * As the camera settles in front of the open doorway, the interior comes
   * up to full brightness so the space reads clearly before STEP INSIDE.
   */
  liftDoorToInterior(): void {
    if (this.interiorGlow) {
      gsap.to((this.interiorGlow.material as THREE.MeshBasicMaterial), { opacity: 0.9, duration: 1.6, ease: "power2.out" });
    }
    if (this.interiorLight) {
      gsap.to(this.interiorLight, { intensity: 40, duration: 2.0, ease: "power2.out" });
      this.tintInteriorLight(0.5);
    }
    gsap.to(this, { fovTarget: 48, dofFocus: 0.3, dofBokeh: 1.45, duration: 1.8, ease: "power2.out" });
  }
}

export const director = new Director();