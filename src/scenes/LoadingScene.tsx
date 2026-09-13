import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useExperience } from "../state/useExperience";
import { experienceConfig } from "../experience.config";
import { quality, prefersReducedMotion } from "../lib/quality";
import { audio } from "../audio/AudioManager";
import { Atmosphere } from "../components/Atmosphere";

/**
 * Cinematic loading. Fake staged progress — no spinners, no "Loading…".
 * The step labels come straight from the config.
 */
export function LoadingScene() {
  const setStage = useExperience((s) => s.setStage);
  const root = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const steps = experienceConfig.text.loading.steps;
  const min = experienceConfig.timings.loading.minDuration;

  useEffect(() => {
    audio.warm(experienceConfig.audio.manifest).catch(() => {});
    const progress = { v: 0 };
    const dur = prefersReducedMotion ? Math.min(min, 1200) : min;
    const tl = gsap.timeline();
    tl.to(progress, {
      v: 1,
      duration: dur / 1000,
      ease: "power2.inOut",
      onUpdate: () => {
        if (bar.current) bar.current.style.transform = `scaleX(${progress.v})`;
        const idx = Math.min(steps.length - 1, Math.floor(progress.v * steps.length));
        const step = steps[idx];
        if (label.current && label.current.textContent !== step) label.current.textContent = step;
      },
      onComplete: () => {
        gsap.to(root.current, { opacity: 0, filter: "blur(10px)", duration: 1.1, ease: "power2.inOut", onComplete: () => setStage("locked") });
      },
    });
    return () => {
      tl.kill();
    };
  }, [setStage, steps, min]);

  return (
    <div className="screen loading-screen" ref={root} role="status" aria-live="polite">
      <div className="loading-screen__bg" />
      <Atmosphere count={Math.round(60 * quality.maxParticleRatio)} color="rgba(201,163,95,0.5)" speed={0.12} />
      <div className="loading-screen__content">
        <span className="loading-screen__mark" aria-hidden>&#8727;</span>
        <h1 className="loading-screen__title">{experienceConfig.text.loading.title}</h1>
        <div className="loading-screen__bar" role="progressbar" aria-label="Loading experience">
          <div className="loading-screen__bar-fill" ref={bar} />
        </div>
        <span className="loading-screen__step" ref={label}>{steps[0]}</span>
      </div>
    </div>
  );
}