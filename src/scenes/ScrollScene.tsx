import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { useExperience } from "../state/useExperience";
import { experienceConfig } from "../experience.config";
import { prefersReducedMotion } from "../lib/quality";
import { Asterisk } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

/**
 * SCENE 05 — the world behind the door. A calm, editorial, scroll-driven
 * chapter built entirely from `experienceConfig.sections`. Lenis drives
 * smooth motion; ScrollTrigger reveals each section as it enters.
 */
export function ScrollScene() {
  const root = useRef<HTMLDivElement>(null);
  const setStage = useExperience((s) => s.setStage);
  const { sections } = experienceConfig;
  const { running, replay, endNote } = experienceConfig.text.scroll;
  const reduce = prefersReducedMotion;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let lenis: Lenis | null = null;
    if (!reduce) {
      lenis = new Lenis({ duration: 1.15, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (time: number) => lenis!.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
    }
    ScrollTrigger.refresh();

    if (!reduce) {
      gsap.utils.toArray<HTMLElement>(".sc-chapter__mask").forEach((mask) => {
        gsap.fromTo(
          mask.querySelector(".sc-chapter__line"),
          { yPercent: 118 },
          {
            yPercent: 0,
            duration: 1.4,
            ease: "power4.out",
            scrollTrigger: { trigger: mask, start: "top 86%", once: true },
          },
        );
      });

      gsap.utils.toArray<HTMLElement>(".sc-memory").forEach((row) => {
        gsap.fromTo(
          row.querySelectorAll(".sc-memory__label, .sc-memory__title, .sc-memory__body"),
          { opacity: 0, y: 26 },
          {
            opacity: 1,
            y: 0,
            duration: 1.1,
            stagger: 0.12,
            ease: "power3.out",
            scrollTrigger: { trigger: row, start: "top 78%", once: true },
          },
        );
        const art = row.querySelector(".sc-memory__art");
        if (art) {
          gsap.fromTo(
            art,
            { opacity: 0.0, scale: 0.96 },
            { opacity: 1, scale: 1, duration: 1.6, ease: "power2.out", scrollTrigger: { trigger: row, start: "top 85%", once: true } },
          );
          gsap.fromTo(
            art.querySelector(".sc-memory__symbol"),
            { yPercent: 14 },
            { yPercent: -14, ease: "none", scrollTrigger: { trigger: row, start: "top bottom", end: "bottom top", scrub: true } },
          );
        }
      });

      gsap.utils.toArray<HTMLElement>(".sc-quote, .sc-closing__inner").forEach((el) => {
        gsap.fromTo(
          el,
          { opacity: 0, y: 34, filter: "blur(8px)" },
          { opacity: 1, y: 0, filter: "blur(0px)", duration: 1.4, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 82%", once: true } },
        );
      });
    }

    return () => {
      if (lenis) {
        lenis.destroy();
      }
      gsap.ticker.lagSmoothing(500 / 60);
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [reduce]);

return (
    <div className="sc" ref={root}>
      <div className="sc__veil" aria-hidden />
      <header className="sc__header">
        <span className="sc__running">{running}</span>
        <button className="sc__replay" onClick={() => setStage("locked")} data-cursor>
          {replay}
        </button>
      </header>

      <section className="sc__hero">
        <p className="sc__hero-eyebrow" aria-hidden>&#8727;</p>
        <h2 className="sc__hero-line">Behind the door</h2>
        <p className="sc__hero-note">keep scrolling — slowly is the only way</p>
      </section>

      {sections.map((sec, i) => {
        if (sec.kind === "chapter") {
          return (
            <section key={i} className="sc-section sc-chapter">
              <div className="sc-chapter__mask">
                <div className="sc-chapter__line">{sec.line}</div>
              </div>
            </section>
          );
        }
        if (sec.kind === "memory") {
          return (
            <section key={i} className="sc-section sc-memory">
              <div className="sc-memory__art" aria-hidden>
                <span className="sc-memory__symbol">{sec.symbol}</span>
                <span className="sc-memory__ring" />
              </div>
              <div className="sc-memory__text">
                <p className="sc-memory__label">{sec.label}</p>
                <h3 className="sc-memory__title">{sec.title}</h3>
                <p className="sc-memory__body">{sec.body}</p>
                {sec.note && <p className="sc-memory__note">{sec.note}</p>}
              </div>
            </section>
          );
        }
        if (sec.kind === "quote") {
          return (
            <section key={i} className="sc-section sc-quote">
              <p className="sc-quote__line">{sec.line}</p>
            </section>
          );
        }
        if (sec.kind === "closing") {
          return (
            <section key={i} className="sc-section sc-closing">
              <div className="sc-closing__inner">
                <div className="sc-closing__rule" aria-hidden />
                <p className="sc-closing__line">{sec.line}</p>
                <p className="sc-closing__sign">{experienceConfig.personal.signature}</p>
              </div>
            </section>
          );
        }
        return null;
      })}

      <footer className="sc__footer">
        <p>{endNote}</p>
        <p className="sc__footer-mark" aria-hidden>
          <Asterisk size={13} strokeWidth={1.4} />
        </p>
      </footer>
    </div>
  );
}