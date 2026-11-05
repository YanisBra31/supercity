"use client";

import { useEffect } from "react";

// Animations de la page de présentation : apparitions au scroll, scène 3D du haut qui suit la souris,
// cartes qui s'inclinent, reflet sous le curseur, vidéos lancées seulement quand elles sont à l'écran.
export default function Vitrine() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const cleanups: (() => void)[] = [];
    requestAnimationFrame(() => root.classList.add("is-loaded"));

    // Apparitions au scroll.
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());

    // Barre de navigation plus opaque une fois la page descendue, et scène 3D qui s'enfonce au scroll.
    const nav = document.querySelector(".nav");
    const scene = document.querySelector<HTMLElement>(".v-scene");
    let frame = 0;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const tick = () => {
      frame = 0;
      nav?.classList.toggle("is-scrolled", window.scrollY > 24);
      if (!scene || reduce) return;
      cur.x += (target.x - cur.x) * 0.08;
      cur.y += (target.y - cur.y) * 0.08;
      const s = Math.min(1, window.scrollY / Math.max(1, window.innerHeight));
      scene.style.setProperty("--mx", cur.x.toFixed(4));
      scene.style.setProperty("--my", cur.y.toFixed(4));
      scene.style.setProperty("--s", s.toFixed(4));
      if (Math.abs(target.x - cur.x) > 0.001 || Math.abs(target.y - cur.y) > 0.001) frame = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX / window.innerWidth - 0.5;
      target.y = e.clientY / window.innerHeight - 0.5;
      kick();
    };
    window.addEventListener("scroll", kick, { passive: true });
    if (finePointer) window.addEventListener("pointermove", onMove, { passive: true });
    kick();
    cleanups.push(() => {
      window.removeEventListener("scroll", kick);
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    });

    // Cartes qui s'inclinent vers le curseur, et reflet lumineux qui le suit.
    if (finePointer && !reduce) {
      document.querySelectorAll<HTMLElement>("[data-tilt], [data-spot]").forEach((el) => {
        const tilt = el.hasAttribute("data-tilt");
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width;
          const y = (e.clientY - r.top) / r.height;
          el.style.setProperty("--px", `${(x * 100).toFixed(1)}%`);
          el.style.setProperty("--py", `${(y * 100).toFixed(1)}%`);
          if (tilt) {
            el.style.setProperty("--tx", `${((0.5 - y) * 8).toFixed(2)}deg`);
            el.style.setProperty("--ty", `${((x - 0.5) * 10).toFixed(2)}deg`);
          }
        };
        const leave = () => {
          el.style.setProperty("--tx", "0deg");
          el.style.setProperty("--ty", "0deg");
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
        });
      });
    }

    // Vidéos : lecture muette quand elles sont visibles, pause sinon ; un bouton pour le son.
    const videos = Array.from(document.querySelectorAll<HTMLVideoElement>(".v-reel video"));
    const vio = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          const v = e.target as HTMLVideoElement;
          if (e.isIntersecting && !reduce) v.play().catch(() => {});
          else v.pause();
        }),
      { threshold: 0.5 }
    );
    videos.forEach((v) => vio.observe(v));
    cleanups.push(() => vio.disconnect());
    document.querySelectorAll<HTMLButtonElement>("[data-sound]").forEach((btn) => {
      const video = btn.parentElement?.querySelector("video");
      if (!video) return;
      const toggle = () => {
        const unmute = video.muted;
        videos.forEach((v) => {
          v.muted = true;
          const b = v.parentElement?.querySelector<HTMLButtonElement>("[data-sound]");
          if (b) {
            b.firstElementChild!.textContent = "🔇";
            b.setAttribute("aria-label", "Activer le son");
          }
        });
        if (unmute) {
          video.muted = false;
          video.currentTime = 0;
          video.play().catch(() => {});
          btn.firstElementChild!.textContent = "🔊";
          btn.setAttribute("aria-label", "Couper le son");
        }
      };
      btn.addEventListener("click", toggle);
      cleanups.push(() => btn.removeEventListener("click", toggle));
    });

    return () => cleanups.forEach((f) => f());
  }, []);

  return null;
}
