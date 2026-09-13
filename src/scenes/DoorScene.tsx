import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useState } from "react";
import { useExperience } from "../state/useExperience";
import { experienceConfig } from "../experience.config";
import { director } from "../director";
import { audio } from "../audio/AudioManager";
import { quality } from "../lib/quality";
import { webglSupported } from "../lib/webgl";
import { SceneContent } from "../three/SceneContent";
import { OpenCta } from "./OpenCta";
import { StepInsideCta } from "./StepInsideCta";
import { DoorFallback } from "./DoorFallback";
import { emitDoor, onDoor } from "./doorEvents";

/**
 * The door scene. The webgl world (or CSS fallback) stays mounted through
 * the whole sequence — opening, pausing, walking through — so the door
 * remains physically present until the camera passes it.
 */
export function DoorScene() {
  const stage = useExperience((s) => s.stage);
  const setStage = useExperience((s) => s.setStage);
  const [webgl] = useState(() => webglSupported());
  const { firstDelay, gap, openAvailableAfter } = experienceConfig.timings.knock;

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      director.onPointerMove((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    window.addEventListener("pointermove", handleMove, { passive: true });
    return () => window.removeEventListener("pointermove", handleMove);
  }, []);

  // knock sequence
  useEffect(() => {
    let t1: ReturnType<typeof setTimeout> | undefined;
    let t2: ReturnType<typeof setTimeout> | undefined;
    let t3: ReturnType<typeof setTimeout> | undefined;

    if (stage === "door_idle") {
      t1 = setTimeout(() => {
        audio.knock(0);
        emitDoor("knock", { variant: 1 });
        setStage("knock_1");
      }, firstDelay);
    } else if (stage === "knock_1") {
      t2 = setTimeout(() => {
        audio.knock(1);
        emitDoor("knock", { variant: 2 });
        setStage("knock_2");
      }, gap);
    } else if (stage === "knock_2") {
      t3 = setTimeout(() => setStage("open_available"), openAvailableAfter);
    }
    return () => {
      if (t1) clearTimeout(t1);
      if (t2) clearTimeout(t2);
      if (t3) clearTimeout(t3);
    };
  }, [stage, setStage, firstDelay, gap, openAvailableAfter]);

  // cinematic lighting states + post-open beats
  useEffect(() => {
    if (stage === "door_idle") director.approachDoor();
    if (stage === "open_available") director.lightHandle();
    if (stage === "door_open") {
      director.setCameraMode("door_open");
      const t = setTimeout(() => {
        director.liftDoorToInterior();
        setStage("step_inside_available");
      }, 1100);
      return () => clearTimeout(t);
    }
  }, [stage]);

  const openNow = () => {
    if (stage !== "open_available" && stage !== "knock_2") return;
    setStage("opening");
    audio.click();
    audio.doorOpen();
    emitDoor("open");
  };

  const stepInside = () => {
    if (stage !== "step_inside_available" && stage !== "door_open") return;
    setStage("entering");
    audio.entryTransition();
    emitDoor("enter");
  };

  return (
    <div className={`door-scene ${stage}`} aria-hidden={stage === "loading" || stage === "locked"}>
      {webgl ? <DoorWorld /> : <DoorFallback />}
      <OpenCta visible={stage === "open_available"} onOpen={openNow} />
      <StepInsideCta visible={stage === "step_inside_available"} onStep={stepInside} />
    </div>
  );
}

function DoorWorld() {
  useEffect(() => {
    const offKnock = onDoor("knock", (d) => director.applyKnock(d.variant ?? 1));
    const offOpen = onDoor("open", () =>
      director.openDoor(() => useExperience.getState().setStage("door_open")),
    );
    const offEnter = onDoor("enter", () => {
      const set = useExperience.getState().setStage;
      director.enterDoor(
        () => {
          audio.startInteriorAmbience();
          audio.revealSwell();
          set("interior_reveal");
        },
        () => set("revealed"),
      );
    });
    return () => {
      offKnock();
      offOpen();
      offEnter();
    };
  }, []);

  return (
    <Canvas
      shadows={quality.shadows}
      dpr={quality.dpr}
      gl={{
        alpha: true,
        antialias: quality.tier !== "low",
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.16,
      }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      camera={{ fov: experienceConfig.camera.fov, position: [0, experienceConfig.camera.eyeHeight, 9.2], near: 0.1, far: 40 }}
    >
      <SceneContent />
    </Canvas>
  );
}