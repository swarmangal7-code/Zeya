import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowUpRight } from "lucide-react";
import { experienceConfig } from "../experience.config";
import { prefersReducedMotion } from "../lib/quality";

/**
 * The "Open the door" CTA — designed as part of the scene, not a widget.
 * Magnetic on desktop, dissolves cinematically on click.
 */
export function OpenCta({ visible, onOpen }: { visible: boolean; onOpen: () => void }) {
  const root = useRef<HTMLButtonElement>(null);
  const { openCta, swipe } = experienceConfig.text.door;
  const opened = useRef(false);

  useEffect(() => {
    if (!root.current) return;
    gsap.to(root.current, {
      opacity: visible ? 1 : 0,
      y: visible ? 0 : 12,
      duration: 0.9,
      ease: "power3.out",
      pointerEvents: visible ? "auto" : "none",
    });
    if (visible) gsap.fromTo(".open-cta__line", { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: "power3.inOut", delay: 0.2 });
  }, [visible]);

  const handleOpen = () => {
    if (opened.current) return;
    opened.current = true;
    onOpen();
    if (root.current) {
      gsap.to(root.current, { opacity: 0, y: -18, filter: "blur(6px)", duration: 0.8, ease: "power3.in" });
    }
  };

  const onMove = (e: React.PointerEvent) => {
    if (prefersReducedMotion || !root.current) return;
    const rect = root.current.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    gsap.to(root.current, { x: dx * 0.22, y: dy * 0.22, duration: 0.5, ease: "power2.out" });
  };

  const onLeave = () => {
    if (root.current) gsap.to(root.current, { x: 0, y: 0, duration: 0.8, ease: "power3.out" });
  };

  return (
    <button
      ref={root}
      className="open-cta"
      onClick={handleOpen}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ opacity: 0, pointerEvents: "none" }}
      aria-label={openCta}
      data-cursor="open"
    >
      <span className="open-cta__label">{openCta}</span>
      <span className="open-cta__arrow" aria-hidden>
        <ArrowUpRight size={18} strokeWidth={1.4} />
      </span>
      <span className="open-cta__line" aria-hidden />
      <span className="open-cta__swipe">{swipe}</span>
    </button>
  );
}