"use client";

import { useEffect, useRef } from "react";

// Curvas de "repetição": sobem, chegam ao pico, descem — como levantar e
// baixar um peso. Decoração do branding, sem significado funcional.
const CURVES = [
  { baseY: 0.28, amp: 0.16, speed: 0.00018, phase: 0, width: 1.4, alpha: 0.5 },
  { baseY: 0.52, amp: 0.2, speed: 0.00014, phase: 2.1, width: 1.1, alpha: 0.32 },
  { baseY: 0.74, amp: 0.13, speed: 0.00022, phase: 4.4, width: 1.8, alpha: 0.4 },
];

export default function EffortLines() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let frameId = 0;

    function resize() {
      if (!canvas) return;
      const rect = canvas.parentElement?.getBoundingClientRect();
      width = rect?.width ?? 0;
      height = rect?.height ?? 0;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function draw(t: number) {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      for (const c of CURVES) {
        ctx.beginPath();
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
          const x = (i / steps) * width;
          const progress = i / steps;
          const wobble =
            Math.sin(progress * Math.PI * 2.4 + c.phase + (reduceMotion ? 0 : t * c.speed)) * c.amp;
          const y = (c.baseY + wobble) * height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(255,109,41,${c.alpha})`;
        ctx.lineWidth = c.width;
        ctx.stroke();
      }
      if (!reduceMotion) frameId = requestAnimationFrame(draw);
    }
    draw(0);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="effort-lines" aria-hidden="true" />;
}
