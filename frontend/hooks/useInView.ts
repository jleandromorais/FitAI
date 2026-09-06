"use client";

import { useEffect, useRef, useState } from "react";

// Dispara uma vez e desliga o observer. Use isto, e nao useEffect(..., []),
// para qualquer animacao abaixo da primeira dobra: presa ao mount ela roda
// enquanto ninguem esta a ver.
export function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);

  // Sem IntersectionObserver (jsdom) nasce "a vista", para nada ficar parado
  // para sempre. O `typeof window` importa: no servidor tambem nao ha IO, e
  // sem ele o SSR renderizaria visivel e o cliente hidrataria invisivel.
  const [inView, setInView] = useState(
    () => typeof window !== "undefined" && typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, inView };
}
