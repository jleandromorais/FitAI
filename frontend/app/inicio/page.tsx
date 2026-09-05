"use client";

/*
  THESIS: FitAI não registra o treino que você já decidiu — a IA propõe o
    treino, a partir do seu perfil, e recusa o molde "app de log" da
    categoria (Strong/Hevy/Fitbod).
  OWN-WORLD: Combustão — carvão quente (#161316), brasa laranja única
    (#ff6d29), Space Grotesk/Inter/JetBrains Mono, superfícies flat em
    degrau, sem sombra fora do glow da própria Brasa.
  STORY: alguém cansado de logar treino sem plano vê a IA construir um
    programa real diante dele (demo fiel ao /ai-gen), vê a execução ao vivo
    e o progresso real que o produto rastreia, e entra pra criar o próprio
    plano.
  FIRST VIEWPORT: headline + CTA duplo à esquerda, card de demonstração
    fiel do fluxo de geração por IA à direita — a prova do mecanismo, não
    uma ilustração genérica.
  FORM: candidato 7 de 7 (hero clássico → destaques → CTA final), estrutura
    escolhida via concept-seed --scope surface --mode persuade, seed
    75c4bc0a — construído com conteúdo real do produto em vez do grid de
    cards ícone+título+texto que a estrutura convida por padrão.
  FINISH: unreviewed and undocumented is unfinished; this build ends with
    the finish review, the verdict, and DESIGN.md.
*/

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, Dumbbell, ArrowRight } from "lucide-react";
import EffortLines from "@/components/ui/EffortLines";
import RepCounter from "@/components/ui/RepCounter";
import { LineChart } from "@/components/ui/Charts";
import heroVictory from "@/img/hero-victory.png";

// Scroll com inércia (técnica de github.com/naocodei — "o conteúdo persegue
// a posição da rolagem em vez de saltar pra ela"), em JS puro, sem lib.
// O documento real ganha um spacer com a altura do conteúdo (mantém a
// scrollbar nativa e o scroll por teclado/roda funcionando de verdade); o
// conteúdo visível fica num wrapper "fixed" que persegue window.scrollY a
// cada frame com atrito. Desativado em touch (o scroll nativo já é bom) e
// com prefers-reduced-motion — nesses casos o scroll é 100% nativo.
function SmoothScroll({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
    if (!reduceMotion && !coarsePointer) setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const wrapper = wrapperRef.current;
    const spacer = spacerRef.current;
    if (!wrapper || !spacer) return;

    let current = window.scrollY;
    let target = window.scrollY;
    let frameId = 0;

    function syncSpacerHeight() {
      spacer!.style.height = `${wrapper!.getBoundingClientRect().height}px`;
    }
    syncSpacerHeight();
    const resizeObserver = new ResizeObserver(syncSpacerHeight);
    resizeObserver.observe(wrapper);

    function onScroll() { target = window.scrollY; }
    window.addEventListener("scroll", onScroll, { passive: true });

    function tick() {
      current += (target - current) * 0.085;
      if (Math.abs(target - current) < 0.05) current = target;
      wrapper!.style.transform = `translate3d(0, ${-current}px, 0)`;
      frameId = requestAnimationFrame(tick);
    }
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
    };
  }, [enabled]);

  return (
    <>
      <div ref={wrapperRef} className={enabled ? "landing-smooth-wrapper" : undefined}>
        {children}
      </div>
      {enabled && <div ref={spacerRef} aria-hidden="true" />}
    </>
  );
}

// Revela cada .landing-reveal quando entra na viewport — um único gesto de
// entrada reaproveitado pela página inteira, nunca uma animação por seção.
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("in-view"); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useScrollReveal();
  return <div ref={ref} className={`landing-reveal ${className}`}>{children}</div>;
}

// Demonstração fiel do fluxo real de /ai-gen: uma pergunta, os chips de
// resposta, a escolha do visitante, e o fragmento de plano que sai disso —
// rotulada como demonstração pra nunca passar por um chat ao vivo real.
// Cicla pra outra pergunta sozinha, devagar, sem precisar de interação.
const DEMO_STEPS = [
  {
    question: "Quantos dias por semana você treina?",
    chips: ["3 dias", "4 dias", "5 dias"],
    picked: 1,
    result: "Split gerado: Upper / Lower — 4x por semana",
  },
  {
    question: "Qual seu objetivo principal?",
    chips: ["Hipertrofia", "Força", "Emagrecimento"],
    picked: 0,
    result: "Esquema ajustado: 3–4 séries de 8–12 reps por exercício",
  },
  {
    question: "Que equipamento você tem disponível?",
    chips: ["Academia completa", "Halteres", "Peso corporal"],
    picked: 0,
    result: "6 exercícios compostos + isolamento selecionados",
  },
];

function AiDemoCard() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setStep(s => (s + 1) % DEMO_STEPS.length), 4200);
    return () => clearInterval(id);
  }, []);

  const current = DEMO_STEPS[step];

  return (
    <div className="landing-demo-card">
      <span className="landing-demo-tag">Demonstração — como a IA gera seu plano</span>
      <div className="landing-demo-msg-ai">{current.question}</div>
      <div className="landing-demo-chips">
        {current.chips.map((c, i) => (
          <span key={c} className={`landing-demo-chip${i === current.picked ? " picked" : ""}`}>{c}</span>
        ))}
      </div>
      <div className="landing-demo-msg-me">{current.chips[current.picked]}</div>
      <div className="landing-demo-result">
        <span className="landing-demo-result-icon"><Sparkles size={16} color="var(--accent)" /></span>
        <span className="landing-demo-result-text"><strong>{current.result}</strong></span>
      </div>
    </div>
  );
}

// Exemplo ilustrativo de evolução de volume — não é dado de um usuário real
// (o produto não tem base de usuários ainda), por isso nunca leva o
// vocabulário de "painel de sistema" (HudCorners, selo ao vivo) que o
// DESIGN.md reserva a dado genuinamente computado.
const EXAMPLE_VOLUME = [3200, 3450, 3400, 3800, 4100, 4050, 4400, 4750];

export default function LandingPage() {
  return (
    <>
      <nav className="landing-nav landing-load landing-load-nav">
        <div className="landing-nav-brand">
          <div className="sidebar-brand-mark" style={{ width: 32, height: 32, fontSize: 14 }}>F</div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--text)" }}>
            FitAI
          </span>
        </div>
        <div className="landing-nav-actions">
          <Link href="/login" className="landing-nav-link">Entrar</Link>
          <Link href="/login?tab=criar" className="btn btn-primary btn-sm">Criar conta</Link>
        </div>
      </nav>

      <SmoothScroll>
      <div className="landing">
      <section className="landing-hero-outer">
        <div className="landing-hero">
          <div className="auth-brand-ember" style={{ opacity: 0.6 }} />
          <div style={{ position: "absolute", inset: 0, opacity: 0.5 }}><EffortLines /></div>
          <Image src={heroVictory} alt="" aria-hidden="true" className="landing-hero-emblem" priority />
          <div className="landing-hero-bottom">
            <div className="landing-hero-content">
              <h1 className="landing-h1">
                Seu próximo treino já está <em className="flame-word">decidido</em> antes de você chegar na academia.
              </h1>
              <p className="landing-lede landing-load landing-load-lede">
                A maioria dos apps de treino só registra o que você já escolheu fazer. O FitAI propõe o plano —
                a IA monta um programa completo a partir do seu nível, objetivo, dias disponíveis e equipamento.
              </p>
              <div className="landing-cta-row landing-load landing-load-cta">
                <Link href="/login?tab=criar" className="btn btn-primary btn-lg">
                  Criar meu plano <ArrowRight size={16} />
                </Link>
                <Link href="/login" className="btn btn-ghost btn-lg">Já tenho conta</Link>
              </div>
            </div>
            <div className="landing-hero-demo landing-load landing-load-card">
              <AiDemoCard />
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section">
        <Reveal className="landing-diff">
          <p className="landing-diff-statement">
            Apps como Strong, Hevy e Fitbod são cadernos digitais — anotam a série que você já decidiu levantar.
            O FitAI é a única parte da sua rotina que <em>decide com você</em>.
          </p>
          <p className="landing-diff-sub">
            Nível, objetivo, dias da semana e o equipamento que você tem disponível viram um split completo —
            Push/Pull/Legs, Upper/Lower, ABC ou Full Body — pronto pra rodar hoje, não uma tabela genérica.
          </p>
        </Reveal>
      </section>

      <section className="landing-section">
        <Reveal>
          <div className="landing-feature-grid">
            <div className="landing-feature-card big">
              <div className="landing-feature-card-visual">
                <RepCounter />
              </div>
              <div>
                <h3 className="landing-feature-card-title">Cada série, cronometrada. Cada peso, editável na hora.</h3>
                <p className="landing-feature-card-text">
                  O FitAI cronometra o descanso entre séries, deixa você ajustar peso e reps em tempo real, e
                  soma o volume levantado enquanto a sessão acontece.
                </p>
              </div>
            </div>
            <div className="landing-feature-card accent">
              <div className="landing-feature-card-visual" style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div className="h-eyebrow" style={{ marginBottom: 8 }}>Exemplo ilustrativo — volume por sessão (kg)</div>
                <LineChart data={EXAMPLE_VOLUME} height={120} label="Exemplo de evolução de volume" />
              </div>
              <div>
                <h3 className="landing-feature-card-title">Carga e volume comparados sessão a sessão, não estimados.</h3>
                <p className="landing-feature-card-text">
                  O FitAI compara o peso e o volume de hoje com a sua última sessão do mesmo exercício —
                  evidência real de progresso, nunca uma média inventada.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="landing-cta-final">
        <div className="auth-brand-glow" style={{ left: "50%", transform: "translateX(-50%)", bottom: -240 }} />
        <Reveal>
          <h2 className="landing-cta-final-title">
            Pare de anotar o treino. Comece a receber um.
          </h2>
          <Link href="/login?tab=criar" className="btn btn-primary btn-lg" style={{ position: "relative", zIndex: 1 }}>
            <Dumbbell size={16} /> Criar meu plano com IA
          </Link>
        </Reveal>
      </section>

      <footer className="landing-footer">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="sidebar-brand-mark" style={{ width: 24, height: 24, fontSize: 11 }}>F</div>
          <span style={{ fontSize: 13, color: "var(--text-dim)" }}>FitAI</span>
        </div>
        <span className="landing-footer-note">© 2026 FitAI. Todos os direitos reservados.</span>
      </footer>
      </div>
      </SmoothScroll>
    </>
  );
}
