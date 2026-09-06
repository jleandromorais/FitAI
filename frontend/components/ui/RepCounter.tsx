"use client";

import { useEffect, useState } from "react";
import { useInView } from "@/hooks/useInView";

// Assinatura visual das telas de autenticação: uma série que nunca termina —
// evoca o esforço contínuo do treino em vez de métricas de "prova social"
// genéricas (usuários ativos, taxa de adesão etc).
const REPS_PER_SET = 12;
const TOTAL_SETS = 4;

export default function RepCounter() {
  const [rep, setRep] = useState(1);
  const [set, setSet] = useState(1);
  // Preso ao mount, na /inicio isto corria desde o carregamento três
  // dobras acima e ninguém via a série começar. No /login não muda nada:
  // o nó já está visível.
  const { ref, inView } = useInView<HTMLDivElement>(0.4);

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = setInterval(() => {
      setRep(r => {
        if (r >= REPS_PER_SET) {
          setSet(s => (s >= TOTAL_SETS ? 1 : s + 1));
          return 1;
        }
        return r + 1;
      });
    }, 650);

    return () => clearInterval(id);
  }, [inView]);

  return (
    <div className="rep-counter" ref={ref} aria-hidden="true">
      <div className="rep-counter-value">
        <span className="rep-counter-num">{String(rep).padStart(2, "0")}</span>
        <span className="rep-counter-label">rep</span>
      </div>
      <div className="rep-counter-dots">
        {Array.from({ length: TOTAL_SETS }, (_, i) => i + 1).map(s => (
          <span
            key={s}
            className={`rep-counter-dot${s < set ? " done" : s === set ? " current" : ""}`}
          />
        ))}
      </div>
      <p className="rep-counter-caption">Série {set} de {TOTAL_SETS} — sem parar antes da hora.</p>
    </div>
  );
}
