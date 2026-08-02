"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw, Check, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import type { GenerateRequest, GeneratedWorkout } from "@/app/api/generate-workout/route";

type Message = { who: "ai" | "me"; text: string; chips?: string[] };

const INITIAL: Message[] = [
  {
    who: "ai",
    text: "Olá! Sou a IA do FitAI. Para montar seu treino ideal, preciso entender alguns pontos. Qual é seu nível?",
    chips: ["Iniciante", "Intermediário", "Avançado"],
  },
];

// Mensagens rotativas durante a geração — não refletem progresso real do
// backend (a IA responde tudo de uma vez), só reduzem a sensação de espera
// morta enquanto o request está em andamento. Cadência (5 msgs × 1800ms =
// 9s) casa com o AbortSignal.timeout(9000) de app/api/generate-workout/route.ts;
// se um dos dois mudar, ajuste o outro. Ao chegar na última mensagem, o
// carrossel para de girar de propósito (assentar em "Finalizando..." em vez
// de repetir do início).
const LOADING_MESSAGES = [
  "Montando seu treino com IA...",
  "Selecionando os melhores exercícios...",
  "Ajustando séries e repetições...",
  "Organizando a divisão da semana...",
  "Finalizando os detalhes...",
];

const FLOW: { key: keyof GenerateRequest; q: string; chips: string[] }[] = [
  { key: "goal",      q: "Perfeito. E qual seu objetivo principal?",         chips: ["Hipertrofia", "Força", "Resistência", "Emagrecimento"] },
  { key: "days",      q: "Quantos dias por semana você pode treinar?",        chips: ["3 dias", "4 dias", "5 dias", "6 dias"] },
  { key: "equipment", q: "Tem acesso a equipamentos?",                        chips: ["Academia completa", "Halteres + barra", "Apenas peso corporal"] },
  { key: "duration",  q: "Quanto tempo por sessão?",                          chips: ["30 min", "45 min", "60 min", "90 min"] },
];

export default function AiGenPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<GenerateRequest>>({});
  const [generating, setGenerating] = useState(false);
  const [generatedWorkouts, setGeneratedWorkouts] = useState<GeneratedWorkout[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);

  useEffect(() => {
    if (!generating) return;
    const id = setInterval(() => {
      setLoadingMsgIndex(i => {
        if (i >= LOADING_MESSAGES.length - 1) {
          clearInterval(id);
          return i;
        }
        return i + 1;
      });
    }, 1800);
    return () => clearInterval(id);
  }, [generating]);

  async function pick(answer: string) {
    const next: Message[] = [...messages, { who: "me", text: answer }];

    if (step === 0) {
      const newAnswers = { ...answers, level: answer };
      setAnswers(newAnswers);
      const f = FLOW[0];
      next.push({ who: "ai", text: f.q, chips: f.chips });
      setMessages(next);
      setStep(1);
      return;
    }

    const flowIndex = step - 1;
    const newAnswers = { ...answers, [FLOW[flowIndex].key]: answer };
    setAnswers(newAnswers);

    if (flowIndex < FLOW.length - 1) {
      const f = FLOW[flowIndex + 1];
      next.push({ who: "ai", text: f.q, chips: f.chips });
      setMessages(next);
      setStep(step + 1);
    } else {
      setMessages(next);
      setGenerating(true);
      setLoadingMsgIndex(0);
      setError(null);

      try {
        const res = await fetch("/api/generate-workout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAnswers as GenerateRequest),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Erro ao gerar treino.");
        }

        const data = await res.json();
        setGeneratedWorkouts(data.workouts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro inesperado. Tente novamente.");
      } finally {
        setGenerating(false);
      }
    }
  }

  async function saveWorkouts() {
    setSaving(true);
    setError(null);
    try {
      for (const w of generatedWorkouts) {
        await api.post("/workouts", w);
      }
      router.push("/treinos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar treinos.");
      setSaving(false);
    }
  }

  function reset() {
    setMessages(INITIAL);
    setStep(0);
    setAnswers({});
    setGeneratedWorkouts([]);
    setGenerating(false);
    setLoadingMsgIndex(0);
    setError(null);
  }

  const done = generatedWorkouts.length > 0;

  return (
    <div className="anim-up" style={{ maxWidth: 900, margin: "0 auto" }}>
      <div className="page-head">
        <div>
          <div className="row gap-2" style={{ marginBottom: 8 }}>
            <Sparkles size={16} color="var(--accent)" />
            <div className="h-eyebrow" style={{ color: "var(--accent)" }}>FitAI Assistant</div>
          </div>
          <h1 className="page-title">Gerador de treino</h1>
          <div className="page-sub">A IA monta um plano sob medida com base no seu objetivo</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0, minHeight: 520, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, padding: 32, overflow: "auto" }}>
          <div className="col gap-4">
            {messages.map((m, i) => (
              <div key={i} className="anim-up">
                {m.who === "ai" ? (
                  <div className="row gap-3" style={{ alignItems: "flex-start" }}>
                    <div className="sidebar-brand-mark" style={{ width: 36, height: 36, fontSize: 14, flexShrink: 0 }}>F</div>
                    <div style={{ maxWidth: 480 }}>
                      <div style={{
                        background: "var(--surface-2)", padding: "14px 18px",
                        borderRadius: "4px 16px 16px 16px", fontSize: 14, lineHeight: 1.55,
                      }}>{m.text}</div>
                      {m.chips && i === messages.length - 1 && !done && !generating && (
                        <div className="row gap-2" style={{ flexWrap: "wrap", marginTop: 12 }}>
                          {m.chips.map(c => (
                            <button key={c} className="chip" style={{ height: 36, padding: "0 14px" }} onClick={() => pick(c)}>
                              {c}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="row gap-3" style={{ alignItems: "flex-start", justifyContent: "flex-end" }}>
                    <div style={{
                      background: "var(--accent)", color: "#000",
                      padding: "14px 18px", borderRadius: "16px 4px 16px 16px",
                      fontSize: 14, fontWeight: 600,
                    }}>{m.text}</div>
                    <div className="avatar" style={{ width: 36, height: 36, fontSize: 12, flexShrink: 0 }}>EU</div>
                  </div>
                )}
              </div>
            ))}

            {generating && (
              <div className="row gap-3 anim-up" style={{ alignItems: "flex-start" }}>
                <div className="sidebar-brand-mark" style={{ width: 36, height: 36, fontSize: 14, flexShrink: 0 }}>F</div>
                <div style={{ background: "var(--surface-2)", padding: "14px 18px", borderRadius: "4px 16px 16px 16px" }}>
                  <div className="row gap-2" style={{ alignItems: "center" }}>
                    {[0, 1, 2].map(i => (
                      <span key={i} className="ai-gen-loading-dot" style={{
                        width: 6, height: 6, borderRadius: "50%", background: "var(--accent)",
                        display: "inline-block", animationDelay: `${i * 0.2}s`,
                      }} />
                    ))}
                    <span key={loadingMsgIndex} className="anim-up" style={{ marginLeft: 8, fontSize: 13, color: "var(--text-dim)" }}>
                      {LOADING_MESSAGES[loadingMsgIndex]}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="anim-up" style={{
                padding: "14px 18px", borderRadius: 12,
                background: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.3)",
                display: "flex", alignItems: "center", gap: 10, fontSize: 14,
              }}>
                <AlertCircle size={16} color="var(--danger)" />
                <span style={{ color: "var(--danger)" }}>{error}</span>
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={reset}>
                  <RefreshCw size={12} /> Tentar novamente
                </button>
              </div>
            )}

            {done && (
              <div className="anim-up">
                <div className="card card-accent" style={{ marginTop: 16 }}>
                  <div className="row gap-3" style={{ marginBottom: 16 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 11, background: "var(--accent)",
                      color: "#000", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Check size={22} />
                    </div>
                    <div>
                      <div className="h-display" style={{ fontSize: 20 }}>
                        {generatedWorkouts.length} treino{generatedWorkouts.length !== 1 ? "s" : ""} gerado{generatedWorkouts.length !== 1 ? "s" : ""}!
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>
                        {answers.goal} · {answers.days} · {answers.duration}
                      </div>
                    </div>
                  </div>

                  <div className="grid-cols-2" style={{ gap: 8, marginBottom: 20 }}>
                    {generatedWorkouts.map(w => (
                      <div key={w.code} style={{
                        background: "var(--surface-2)", padding: "12px 14px",
                        borderRadius: 10, fontSize: 13,
                      }}>
                        <div style={{ fontWeight: 700, color: "var(--accent)", marginBottom: 2 }}>
                          {w.code} — {w.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-mute)" }}>
                          {w.exercises.length} exercícios · {w.schedule}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="row gap-2">
                    <button
                      className="btn btn-primary flex-1"
                      style={{ justifyContent: "center" }}
                      onClick={saveWorkouts}
                      disabled={saving}
                    >
                      {saving ? "Salvando..." : "Salvar e ver treinos"}
                    </button>
                    <button className="btn btn-secondary" onClick={reset} disabled={saving}>
                      <RefreshCw size={14} /> Gerar outro
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        .ai-gen-loading-dot { animation: bounce 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
