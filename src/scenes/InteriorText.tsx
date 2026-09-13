import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useExperience } from "../state/useExperience";
import { experienceConfig } from "../experience.config";
import { prefersReducedMotion } from "../lib/quality";

/**
 * The interior text moment. Shown only after the camera is physically
 * inside, over a fully transparent view so the architecture stays the
 * subject. Appears quietly, holds, fades; afterwards a very quiet
 * "continue" invites the scroll chapter.
 */
export function InteriorText() {
  const root = useRef<HTMLDivElement>(null);
  const line = useRef<HTMLParagraphElement>(null);
  const cont = useRef<HTMLButtonElement>(null);
  const setStage = useExperience((s) => s.setStage);
  const { content, appearAfterMs, stayMs, fadeMs, continueAfterMs } = experienceConfig.interior.text;
  const reduce = prefersReducedMotion;

  useEffect(() => {
    const tl = gsap.timeline();
    if (line.current && !reduce) {
      gsap.set(line.current, { opacity: 0, y: 18, filter: "blur(10px)", letterSpacing: "0.35em" });
    }
    if (line.current) tl.to(line.current, { opacity: 1, y: 0, filter: "blur(0px)", letterSpacing: "0.06em", duration: 1.6, ease: "power3.out" }, appearAfterMs / 1000);
    if (line.current) tl.to(line.current, { opacity: 0, y: -16, filter: "blur(8px)", letterSpacing: "0.2em", duration: fadeMs / 1000, ease: "power2.inOut" }, (appearAfterMs + stayMs) / 1000);
    tl.call(() => {
      if (cont.current) {
        gsap.to(cont.current, { opacity: 1, y: 0, duration: 1.0, ease: "power2.out" });
      }
    }, undefined, (appearAfterMs + stayMs + fadeMs + continueAfterMs) / 1000);
    return () => {
      tl.kill();
    };
  }, [appearAfterMs, stayMs, fadeMs, continueAfterMs, reduce]);

  const onContinue = () => {
    if (root.current) gsap.to(root.current, { opacity: 0, filter: "blur(8px)", duration: 0.9, ease: "power2.in", onComplete: () => setStage("scroll") });
  };

  return (
    <div className="screen interior-text" ref={root} role="presentation">
      <p className="interior-text__line" ref={line} aria-label={content}>{content}</p>
      <button ref={cont} className="interior-text__continue" onClick={onContinue} data-cursor aria-label="Continue" style={{ opacity: 0, transform: "translateY(8px)" }}>
        {experienceConfig.text.scroll.continue}
      </button>
    </div>
  );
}