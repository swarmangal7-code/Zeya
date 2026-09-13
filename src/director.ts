import * as THREE from "three";
import gsap from "gsap";

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
    y: 0.55,
    z: 6.4,
  };
  camLook = { x: 0, y: 2.15, z: 0 };
  /** distance that frames the door fully for the current viewport */
  fitZ = 6.4;
  doorOpenInitiated = false;
  impulse = { x: 0, y: 0 };
  fovTarget = 42;
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
  }

  /** Adopt a framing distance that fits the door for the current viewport. */
  adoptFitZ(): void {
    if (this.doorOpenInitiated) return;
    if (Math.abs(this.fitZ - this.camTarget.z) > 0.04) {
      gsap.to(this.camTarget, { z: this.fitZ, duration: 0.7, ease: "power1.out", overwrite: true });
    }
  }

  setStartDoor(): void {
    gsap.set(this.camTarget, { x: 0, y: 0.55, z: this.fitZ });
    gsap.set(this.camLook, { x: 0, y: 2.15, z: 0 });
    this.fovTarget = 42;
    this.doorOpenInitiated = false;
  }

  onPointerMove(x: number, y: number): void {
    this.mouse.x = x;
    this.mouse.y = y;
  }

  /* ------------------------------------------------------------------ */
  /* Knock                                                              */
  /* ------------------------------------------------------------------ */

  applyKnock(variant: 1 | 2): void {
    if (!this.knocked) {
      this.knocked = true;
      this.fovTarget = 42;
    }
    const door = variant === 1 ? this.doorRight : this.doorLeft;
    if (!door) return;

    // physical door response — a quick believable impulse, not a shake
    gsap.fromTo(door.rotation, { y: door.rotation.y }, {
      y: door.rotation.y + (variant === 1 ? -0.018 : 0.018),
      duration: 0.07,
      ease: "power2.out",
      yoyo: true,
      repeat: 2,
      onComplete: () => gsap.to(door.rotation, { y: 0, duration: 0.5, ease: "elastic.out(1, 0.32)" }),
    });

    // frame transmission
    if (this.frameGroup) {
      gsap.fromTo(this.frameGroup.position, { x: 0 }, {
        x: variant === 1 ? -0.006 : 0.006,
        duration: 0.05,
        yoyo: true,
        repeat: 1,
        ease: "none",
        onComplete: () => gsap.to(this.frameGroup!.position, { x: 0, duration: 0.3 }),
      });
    }

    // camera impulse
    this.impulse.x += variant === 1 ? -0.06 : 0.05;
    this.impulse.y += 0.03;

    // dust startled
    if (this.dust) {
      gsap.fromTo(this.dust.position, { x: 0 }, { x: 0.04, duration: 0.1, yoyo: true, repeat: 1, onComplete: () => gsap.to(this.dust!.position, { x: 0, duration: 0.6 }) });
    }
  }

  /** Catch the decaying camera impulse each frame. */
  drainImpulse(dt: number): void {
    const d = Math.min(1, (dt ?? 0.016) * 6);
    this.impulse.x *= 1 - d;
    this.impulse.y *= 1 - d;
  }

  /* ------------------------------------------------------------------ */
  /* Opening                                                            */
  /* ------------------------------------------------------------------ */

  openDoor(onReveal?: () => void, onDone?: () => void): void {
    this.doorOpenInitiated = true;
    const tl = gsap.timeline();
    const total = 4.6;

    tl.to(this.camTarget, { z: 2.1, duration: total * 0.9, ease: "power2.inOut" }, 0)
      .to(this.camTarget, { y: 0.3, duration: total * 0.9, ease: "power1.inOut" }, 0)
      .to(this, { fovTarget: 58, duration: total * 0.9, ease: "power2.inOut" }, 0)
      .to(this.camLook, { y: 2.3, duration: total * 0.9, ease: "power1.inOut" }, 0);

    if (this.doorLeft) {
      tl.to(this.doorLeft.rotation, {
        y: 1.85,
        duration: total,
        ease: "power3.inOut",
        // slight initial resistance then swing
      }, 0);
    }
    if (this.doorRight) {
      tl.to(this.doorRight.rotation, {
        y: -1.85,
        duration: total,
        ease: "power3.inOut",
      }, 0);
    }

    if (this.interiorGlow) {
      tl.fromTo(this.interiorGlow.material,
        { opacity: 0.18 },
        { opacity: 0.85, duration: total * 0.6, ease: "power2.out" },
        0.2,
      );
    }
    if (this.interiorLight) {
      tl.fromTo(this.interiorLight, { intensity: 0 }, { intensity: 55, duration: total * 0.6, ease: "power2.out" }, 0.2);
    }
    if (this.keyLight) {
      tl.fromTo(this.keyLight, { intensity: 0.25 }, { intensity: 2.4, duration: total * 0.7, ease: "power2.out" }, 0.4);
    }
    if (this.handleLight) {
      tl.to(this.handleLight, { intensity: 0, duration: 1.2 }, 0);
    }
    if (this.revealFog) {
      tl.to(this.revealFog, { near: 0.2, far: 9, duration: total, ease: "power1.inOut" }, 0);
    }

    tl.call(
      () => {
        this.doorOpenAmount = 1;
        onReveal?.();
      },
      undefined,
      total * 0.5,
    );

    tl.call(() => onDone?.(), undefined, total * 0.82);
  }
}

export const director = new Director();