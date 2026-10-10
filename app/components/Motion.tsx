"use client";

import { useEffect, useRef, useState } from "react";
import { Ball } from "./Loader";

// Le fil du match : une ligne de craie qui se trace au scroll, un ballon qui la suit,
// un repère par section et un chrono de 0' à 90'.
const SECTIONS = [
  { id: "top", label: "Coup d'envoi" },
  { id: "concept", label: "Le concept" },
  { id: "formats", label: "Formats" },
  { id: "appli", label: "L'appli" },
  { id: "rejoindre", label: "Rejoins-nous" },
];

const PATH = "M20 0 C 34 70, 6 150, 20 250 S 34 420, 20 500 S 6 660, 20 750 S 34 930, 20 1000";

export default function Motion() {
  const pathRef = useRef<SVGPathElement>(null);
  const [marks, setMarks] = useState<{ x: number; y: number; p: number }[]>([]);
  const [ball, setBall] = useState({ x: 20, y: 0 });
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Fin du chargement : au moins 900 ms pour que l'animation se voie.
    const started = performance.now();
    const done = () => {
      const wait = reduce ? 0 : Math.max(0, 900 - (performance.now() - started));
      window.setTimeout(() => root.classList.add("is-loaded"), wait);
    };
    if (document.readyState === "complete") done();
    else window.addEventListener("load", done, { once: true });

    // Apparitions au scroll.
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    const path = pathRef.current;
    const len = path?.getTotalLength() ?? 1000;
    const sections = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const parallax = Array.from(document.querySelectorAll<HTMLElement>("[data-parallax]"));
    let stops: number[] = [];

    const point = (p: number) => {
      const pt = path ? path.getPointAtLength(p * len) : { x: 20, y: p * 1000 };
      return { x: pt.x, y: pt.y };
    };

    const measure = () => {
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      stops = sections.map((s) => Math.min(1, Math.max(0, (s.offsetTop - window.innerHeight * 0.35) / max)));
      stops[0] = 0;
      setMarks(stops.map((p) => ({ ...point(p), p })));
    };

    let frame = 0;
    const update = () => {
      frame = 0;
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      root.style.setProperty("--scroll", p.toFixed(4));
      root.style.setProperty("--sy", `${window.scrollY}px`);
      setProgress(p);
      setBall(point(p));
      let a = 0;
      stops.forEach((s, i) => {
        if (p >= s - 0.001) a = i;
      });
      setActive(a);
      const vh = window.innerHeight;
      parallax.forEach((el) => {
        const r = el.getBoundingClientRect();
        const t = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.setProperty("--p", Math.max(-1, Math.min(1, t)).toFixed(3));
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onResize = () => {
      measure();
      onScroll();
    };

    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    // Les images et la police changent la hauteur de la page : on remesure une fois tout chargé.
    window.addEventListener("load", onResize, { once: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const minute = Math.round(progress * 90);

  return (
    <>
      <nav className="thread" aria-label="Progression">
        <svg className="thread__svg" viewBox="0 0 40 1000" preserveAspectRatio="none" aria-hidden="true">
          <path className="thread__track" d={PATH} vectorEffect="non-scaling-stroke" />
          <path
            ref={pathRef}
            className="thread__line"
            d={PATH}
            pathLength={1}
            vectorEffect="non-scaling-stroke"
            style={{ strokeDashoffset: 1 - progress }}
          />
        </svg>
        {marks.map((m, i) => (
          <a
            key={SECTIONS[i].id}
            href={`#${SECTIONS[i].id}`}
            className={`thread__mark${i <= active ? " is-passed" : ""}${i === active ? " is-active" : ""}`}
            style={{ left: `${(m.x / 40) * 100}%`, top: `${m.y / 10}%` }}
          >
            <span className="thread__label">{SECTIONS[i].label}</span>
          </a>
        ))}
        <span
          className="thread__ball"
          style={{ left: `${(ball.x / 40) * 100}%`, top: `${ball.y / 10}%`, "--spin": `${progress * 1440}deg` } as React.CSSProperties}
          aria-hidden="true"
        >
          <Ball />
        </span>
        <span className="thread__clock" aria-hidden="true">
          <b>{minute}&apos;</b> {SECTIONS[active]?.label}
        </span>
      </nav>
      <div className="topbar" aria-hidden="true">
        <span className="topbar__fill" style={{ transform: `scaleX(${progress})` }} />
        <span className="topbar__label">
          {SECTIONS[active]?.label} · {minute}&apos;
        </span>
      </div>
    </>
  );
}
