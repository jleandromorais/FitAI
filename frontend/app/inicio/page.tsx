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
import { Sparkles, Dumbbell, ArrowRight } from "lucide-react";
import EffortLines from "@/components/ui/EffortLines";
import RepCounter from "@/components/ui/RepCounter";
import { LineChart } from "@/components/ui/Charts";

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
    <div className="landing">
      <nav className="landing-nav">
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

      <section className="landing-hero">
        <div className="auth-brand-ember" style={{ opacity: 0.6 }} />
        <div style={{ position: "absolute", inset: 0, opacity: 0.5 }}><EffortLines /></div>
        <div className="landing-hero-grid">
          <div>
            <h1 className="landing-h1">
              Seu próximo treino já está <em className="flame-word">decidido</em> antes de você chegar na academia.
            </h1>
            <p className="landing-lede">
              A maioria dos apps de treino só registra o que você já escolheu fazer. O FitAI propõe o plano —
              a IA monta um programa completo a partir do seu nível, objetivo, dias disponíveis e equipamento.
            </p>
            <div className="landing-cta-row">
              <Link href="/login?tab=criar" className="btn btn-primary btn-lg">
                Criar meu plano <ArrowRight size={16} />
              </Link>
              <Link href="/login" className="btn btn-ghost btn-lg">Já tenho conta</Link>
            </div>
          </div>
          <Reveal>
            <AiDemoCard />
          </Reveal>
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
        <div className="landing-split">
          <Reveal>
            <div>
              <h2 className="landing-split-title">Cada série, cronometrada. Cada peso, editável na hora.</h2>
              <p className="landing-split-text">
                Durante o treino, o FitAI cronometra o descanso entre séries, deixa você ajustar peso e reps
                em tempo real, e soma o volume levantado enquanto a sessão acontece — sem precisar fechar o
                app pra fazer conta depois.
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div className="landing-split-visual">
              <RepCounter />
            </div>
          </Reveal>
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-split reverse">
          <Reveal>
            <div>
              <h2 className="landing-split-title">Carga e volume comparados sessão a sessão, não estimados.</h2>
              <p className="landing-split-text">
                Cada série executada fica salva. O FitAI compara o peso e o volume de hoje com a sua última
                sessão do mesmo exercício — evidência real de progresso, ou de estagnação, nunca uma média
                inventada.
              </p>
            </div>
          </Reveal>
          <Reveal>
            <div className="landing-split-visual" style={{ padding: "32px 32px 20px", flexDirection: "column", alignItems: "stretch" }}>
              <div className="h-eyebrow" style={{ marginBottom: 8 }}>Exemplo ilustrativo — volume por sessão (kg)</div>
              <LineChart data={EXAMPLE_VOLUME} height={160} label="Exemplo de evolução de volume" />
            </div>
          </Reveal>
        </div>
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
  );
}
