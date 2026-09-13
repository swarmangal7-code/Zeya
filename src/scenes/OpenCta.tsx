import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowUpRight } from "lucide-react";
import { experienceConfig } from "../experience.config";
import { prefersReducedMotion } from "../lib/quality";

/**
 * "Open the door" — physically part of the door stage, not a web button.
 * Positioned near the lower-central safe zone so it reads as connected
 * to the door composition. Magnetic on desktop, dissolves on click.
 */
export function OpenCta({ visible, onOpen }: { visible: boolean; onOpen: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const { openCta, swipe } = experienceConfig.text.door;

  useEffect(() => {
    if (!root.current) return;
    gsap.to(root.current, {
      opacity: visible ? 1 : 0,
      y: visible ? 0 : 14,
      duration: 0.9,
      ease: "power3.out",
      pointerEvents: visible ? "auto" : "none",
    });
    if (visible) gsap.fromTo(".open-cta__line", { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "power3.inOut", delay: 0.15 });
  }, [visible]);

  const handleOpen = () => {
    onOpen();
    if (root.current) gsap.to(root.current, { opacity: 0, y: -16, filter: "blur(6px)", duration: 0.8, ease: "power3.in" });
  };

  const onMove = (e: React.PointerEvent) => {
    if (prefersReducedMotion || !btn.current) return;
    const rect = btn.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    gsap.to(btn.current, { x: dx * 0.18, y: dy * 0.18, duration: 0.5, ease: "power2.out" });
  };

  const onLeave = () => {
    if (btn.current) gsap.to(btn.current, { x: 0, y: 0, duration: 0.7, ease: "power3.out" });
  };

  return (
    <div className="open-cta" ref={root} style={{ opacity: 0, pointerEvents: "none" }} aria-hidden={!visible}>
      <button
        ref={btn}
        className="open-cta__btn"
        onClick={handleOpen}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        aria-label={openCta}
        data-cursor="open"
      >
        <span className="open-cta__label">{openCta}</span>
        <span className="open-cta__arrow" aria-hidden>
          <ArrowUpRight size={16} strokeWidth={1.4} />
        </span>
        <span className="open-cta__line" aria-hidden />
      </button>
      <span className="open-cta__swipe">{swipe}</span>
    </div>
  );
}