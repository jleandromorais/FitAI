"use client";

import { useEffect, useState } from "react";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface UseCountUpOptions {
  durationMs?: number;
  delayMs?: number;
  /** Pula a animação e entrega o valor final direto — ex: já animou nesta sessão. */
  skip?: boolean;
}

interface CountUpResult {
  value: number;
  /** true assim que o valor chega ao alvo (ou nunca chegou a animar). */
  done: boolean;
}

// Anima de 0 até `target` ao montar — reforça que o número acabou de chegar de
// uma fonte real (backend), não é texto estático. Quando pula (reduced-motion
// ou `skip`), devolve `target` calculado no próprio render — nunca um valor
// guardado em useState, senão fica congelado no que `target` era no primeiro
// render (tipicamente 0, antes do fetch resolver) e nunca mais acompanha o
// valor real quando os dados chegam.
export function useCountUp(target: number, options: UseCountUpOptions = {}): CountUpResult {
  const { durationMs = 700, delayMs = 0, skip = false } = options;
  const [shouldSkip] = useState(() => skip || prefersReducedMotion());
  const [animatedValue, setAnimatedValue] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (shouldSkip) return; // nada a animar — o valor devolvido vem direto de `target`, sempre atualizado

    let raf: number;
    const timeout = window.setTimeout(() => {
      setDone(false); // reinicia se `target` mudou depois de uma animação anterior já ter assentado
      const start = performance.now();
      function tick(now: number) {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - (1 - t) * (1 - t); // ease-out-quad
        setAnimatedValue(target * eased);
        if (t < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          setDone(true);
        }
      }
      raf = requestAnimationFrame(tick);
    }, delayMs);

    return () => { clearTimeout(timeout); cancelAnimationFrame(raf); };
  }, [target, durationMs, delayMs, shouldSkip]);

  if (shouldSkip) return { value: target, done: true };
  return { value: animatedValue, done };
}
