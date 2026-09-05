"use client";

import { useEffect, useRef, useState } from "react";

// "Este no ja entrou na viewport?" — dispara uma vez e desliga o observer.
//
// Existe porque animacao de entrada presa ao mount mente numa pagina longa: o
// no anima enquanto ainda esta tres dobras abaixo e quem rola ate la encontra
// so o estado final, sem nunca ver o movimento. Tudo o que anima abaixo da
// primeira dobra deve pendurar-se nisto, nao em useEffect(..., []).
//
// Irmao do useScrollReveal de inicio/page.tsx: aquele comuta uma classe no
// proprio no, este devolve um booleano para quem precisa de decidir logica
// (arrancar um intervalo, disparar um desenho de linha).
export function useInView<T extends Element>(threshold = 0.25) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

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
