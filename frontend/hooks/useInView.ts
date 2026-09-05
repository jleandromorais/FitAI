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

  // Falha aberto: sem IntersectionObserver (jsdom nos testes, browsers muito
  // antigos) o no nasce ja "a vista". Mais vale a animacao arrancar de
  // imediato do que um contador parado para sempre ou uma linha de grafico
  // que nunca se desenha, so porque a API nao existe.
  //
  // A pergunta e "estamos num CLIENTE sem IntersectionObserver?", nao apenas
  // "nao ha IntersectionObserver?": no servidor tambem nao ha, mas o cliente
  // que vai hidratar quase de certeza tem. Sem o `typeof window`, o servidor
  // renderizaria "a vista" e o cliente hidrataria "fora de vista" — mismatch,
  // e no LineChart a linha apareceria feita antes de se desenhar.
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
