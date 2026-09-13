import { useEffect, useRef } from "react";
import gsap from "gsap";
import { experienceConfig } from "../experience.config";

/**
 * STEP INSIDE — a quiet cinematic prompt shown only once the door is fully
 * open and the camera has settled on the interior.
 */
export function StepInsideCta({ visible, onStep }: { visible: boolean; onStep: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const { stepInside, swipe } = experienceConfig.text.door;

  useEffect(() => {
    if (!root.current) return;
    gsap.to(root.current, {
      opacity: visible ? 1 : 0,
      y: visible ? 0 : 14,
      duration: 0.9,
      ease: "power3.out",
      pointerEvents: visible ? "auto" : "none",
    });
    if (visible) gsap.fromTo(".step-inside__line", { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "power3.inOut", delay: 0.15 });
  }, [visible]);

  const onClick = () => {
    onStep();
    if (root.current) gsap.to(root.current, { opacity: 0, y: -14, filter: "blur(6px)", duration: 0.7, ease: "power3.in" });
  };

  return (
    <div className="step-inside" ref={root} style={{ opacity: 0, pointerEvents: "none" }} aria-hidden={!visible}>
      <button ref={btn} className="step-inside__btn" onClick={onClick} data-cursor="open" aria-label={stepInside}>
        <span className="step-inside__label">{stepInside.toUpperCase()}</span>
        <span className="step-inside__line" aria-hidden />
      </button>
      <span className="step-inside__hint">{swipe}</span>
    </div>
  );
}