import { useEffect, useRef } from "react";
import gsap from "gsap";
import { useExperience } from "../state/useExperience";
import { experienceConfig } from "../experience.config";
import { prefersReducedMotion } from "../lib/quality";

/**
 * The world behind the door. A quiet, cinematic title sequence —
 * no particles, no decoration; the flowing gradient and typography
 * carry the feeling.
 */
export function RevealScene() {
  const setStage = useExperience((s) => s.setStage);
  const root = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLParagraphElement>(null);
  const second = useRef<HTMLHeadingElement>(null);
  const sub = useRef<HTMLParagraphElement>(null);
  const cont = useRef<HTMLButtonElement>(null);
  const { first: line1, second: line2, sub: subText, continueLabel } = experienceConfig.text.reveal;
  const gap = experienceConfig.timings.reveal.textGap;
  const after = experienceConfig.timings.reveal.continueAfter;
  const reduce = prefersReducedMotion;

  useEffect(() => {
    const words = line1.split(" ");
    const line = first.current!;
    line.innerHTML = "";
    for (const w of words) {
      const mask = document.createElement("span");
      mask.className = "rev-word-mask";
      const word = document.createElement("span");
      word.className = "rev-word";
      word.textContent = w;
      mask.appendChild(word);
      line.appendChild(mask);
    }

    const tl = gsap.timeline({ delay: 0.35 });
    if (reduce) {
      tl.fromTo(".rev-word, .rev-sub", { opacity: 0 }, { opacity: 1, duration: 1.2, stagger: 0.14, ease: "power2.out" });
    } else {
      tl.fromTo(".rev-word", { yPercent: 126, opacity: 0.5, filter: "blur(6px)" }, {
        yPercent: 0,
        opacity: 1,
        filter: "blur(0px)",
        duration: 1.45,
        stagger: 0.11,
        ease: "power4.out",
      }, 0);
      tl.fromTo(second.current, { opacity: 0, letterSpacing: "0.4em", filter: "blur(12px)", scale: 0.98 }, {
        opacity: 1,
        letterSpacing: "0.05em",
        filter: "blur(0px)",
        scale: 1,
        duration: 2.1,
        ease: "power3.out",
      }, gap / 1000);
      tl.fromTo(sub.current, { opacity: 0, y: 10 }, { opacity: 0.62, y: 0, duration: 1.2, ease: "power2.out" }, gap / 1000 + 1.1);
    }
    tl.to(cont.current, { opacity: 1, y: 0, duration: 1.0, ease: "power2.out" }, reduce ? 0.6 : (gap + after) / 1000);
    return () => {
      tl.kill();
    };
  }, [line1, gap, after, reduce]);

  const onContinue = () => {
    if (cont.current) gsap.to(cont.current, { opacity: 0, duration: 0.4 });
    gsap.to(root.current, { opacity: 0, filter: "blur(8px)", duration: 1.0, ease: "power2.in", onComplete: () => setStage("scroll") });
  };

  return (
    <div className="screen reveal-screen" ref={root} role="presentation">
      <div className="reveal-screen__scrim" />
      <div className="reveal-screen__glow" />

      <div className="reveal-screen__inner">
        <p className="rev-first" ref={first} aria-label={line1} />
        <p className="reveal-screen__ornament" aria-hidden>
          <span />
        </p>
        <h1 className="rev-second" ref={second}>{line2}</h1>
        <p className="rev-sub" ref={sub}>{subText}</p>
        <button className="rev-cont" ref={cont} onClick={onContinue} data-cursor="open">
          {continueLabel}
        </button>
      </div>
    </div>
  );
}