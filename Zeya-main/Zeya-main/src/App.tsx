import { lazy, Suspense, useEffect } from "react";
import { useExperience } from "./state/useExperience";
import { experienceConfig } from "./experience.config";
import { audio } from "./audio/AudioManager";
import { FilmGrain } from "./components/FilmGrain";
import { Cursor } from "./components/Cursor";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { CinematicGradient } from "./components/CinematicGradient";
import type { GradientVariantKey } from "./experience.config";
import { LoadingScene } from "./scenes/LoadingScene";
import { LockScreenScene } from "./scenes/LockScreenScene";
import { RevealScene } from "./scenes/RevealScene";
import { Volume2, VolumeX } from "lucide-react";

const DoorScene = lazy(() =>
  import("./scenes/DoorScene").then((m) => ({ default: m.DoorScene })),
);
const ScrollScene = lazy(() =>
  import("./scenes/ScrollScene").then((m) => ({ default: m.ScrollScene })),
);

const gradientVariant = (stage: ReturnType<typeof useExperience.getState>["stage"]): GradientVariantKey => {
  if (stage === "interior_reveal" || stage === "revealed") return "reveal";
  if (stage === "scroll") return "scroll";
  if (stage === "loading" || stage === "locked" || stage === "unlocking") return "lock";
  return "door";
};

export default function App() {
  const stage = useExperience((s) => s.stage);
  const muted = useExperience((s) => s.muted);
  const setMuted = useExperience((s) => s.setMuted);
  const setStage = useExperience((s) => s.setStage);

  const isScroll = stage === "scroll";
  const showWorld = stage !== "scroll" && stage !== "loading";

  useEffect(() => {
    audio.applyMuted(useExperience.getState().muted);
  }, []);

  useEffect(() => {
    if (stage === "unlocking") audio.startAmbient();
  }, [stage]);

  // allow body scroll only in the final chapter
  useEffect(() => {
    document.documentElement.classList.toggle("scroll-live", isScroll);
    if (isScroll) window.scrollTo(0, 0);
    return () => document.documentElement.classList.remove("scroll-live");
  }, [isScroll]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    audio.applyMuted(next);
  };

  return (
    <div className={`experience ${isScroll ? "scrolling" : ""}`} data-stage={stage}>
      {experienceConfig.gradient.enabled && <CinematicGradient variant={gradientVariant(stage)} />}
      <FilmGrain />
      <div className="vignette" aria-hidden />

      {showWorld && (
        <div className="world">
          <ErrorBoundary
            fallback={
              <div className="screen door-fail">
                <p>Something kept this door shut.</p>
                <button onClick={() => setStage("interior_reveal")} data-cursor>Enter anyway</button>
              </div>
            }
          >
            <Suspense fallback={null}>
              <DoorScene />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {stage === "loading" && <LoadingScene />}
      {(stage === "locked" || stage === "unlocking") && <LockScreenScene />}
      {(stage === "interior_reveal" || stage === "revealed") && <RevealScene />}

      {isScroll && (
        <Suspense fallback={null}>
          <ScrollScene />
        </Suspense>
      )}

      {stage !== "loading" && (
        <button
          className="mute"
          onClick={toggleMute}
          aria-pressed={muted}
          aria-label={muted ? "Turn sound on" : "Turn sound off"}
          data-cursor
        >
          {muted ? <VolumeX size={15} strokeWidth={1.5} /> : <Volume2 size={15} strokeWidth={1.5} />}
        </button>
      )}

      <Cursor />
    </div>
  );
}