"use client";

import Link from "next/link";
import Image from "next/image";
import { Play, Timer, Dumbbell, Target, Sparkles, Trophy, Loader2, AlertCircle, RefreshCw, Check } from "lucide-react";
import { Sparkline } from "@/components/ui/Charts";
import heroStrongman from "@/img/hero-strongman.png";
import { HudCorners } from "@/components/ui/HudCorners";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useProgress } from "@/hooks/useProgress";
import { useProgressStats } from "@/hooks/useProgressStats";
import { useSessions } from "@/hooks/useSessions";
import { useCountUp } from "@/hooks/useCountUp";
import { useEffect, useMemo, useState } from "react";
import type { Workout } from "@/hooks/useWorkouts";

// Só anima a contagem uma vez por sessão de navegador — a 2ª visita ao
// dashboard na mesma aba entra direto no valor final, sem repetir o "boot".
const DASHBOARD_INTRO_SEEN_KEY = "fitai:dashboard-intro-seen";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de cálculo
// ─────────────────────────────────────────────────────────────────────────────

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]; // alinhado a Date.getDay() (0=Dom)

// Treino agendado (campo `schedule`, ex: "Seg, Qua") para o dia da semana atual —
// mesma normalização usada em calendario/page.tsx, pra manter os dois em sincronia.
function findScheduledToday(workouts: Workout[]): Workout | undefined {
  const todayName = DAY_NAMES[new Date().getDay()];
  return workouts.find(w => {
    if (!w.schedule) return false;
    const days = w.schedule.split(/[,·\s]+/).map(d => d.trim());
    return days.some(d => todayName.toLowerCase().startsWith(d.toLowerCase().slice(0, 3)));
  });
}

function calcMuscleDistribution(workouts: Workout[]) {
  const counts: Record<string, number> = {};
  let total = 0;

  for (const w of workouts) {
    for (const ex of w.exercises) {
      const group = ex.muscle?.split(" ")?.[0] ?? "Outros";
      counts[group] = (counts[group] ?? 0) + 1;
      total++;
    }
  }

  if (total === 0) return [];

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label, value: Math.round((count / total) * 100) }));
}

// Só usa volumes reais — o Sparkline em si já lida com poucos pontos (ou
// nenhum), então não há motivo pra inventar uma curva quando faltam dados.
function buildVolumeSparkline(volumePerWorkout: number[]): number[] {
  return volumePerWorkout.slice(-12);
}

function greetingFor(hour: number): string {
  if (hour < 12) return "Bom dia";
  if (hour < 20) return "Boa tarde";
  return "Boa noite";
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "atleta";

  const { workouts, loading, error, reload } = useWorkouts();
  const { data: progress } = useProgress();
  const { sessions, loading: sessionsLoading, error: sessionsError } = useSessions(7);
  // Lazy initializer é a forma pura de ler Date.now() no render (mesmo padrão de progresso/page.tsx).
  const [now] = useState(() => Date.now());
  const { prs } = useProgressStats(progress, sessions, 0, now);
  const greeting = greetingFor(new Date(now).getHours());

  const stats = useMemo(() => {
    if (workouts.length === 0) return null;

    const totalVolume = progress?.totalVolume ?? workouts.reduce((sum, w) => sum + (w.volume ?? 0), 0);
    const totalSets   = progress?.totalSetsCompleted ?? workouts.reduce((sum, w) => sum + (w.totalSets ?? 0), 0);
    const scheduledToday = findScheduledToday(workouts);
    const featured    = scheduledToday ?? [...workouts].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))[0];
    const muscleDistribution = calcMuscleDistribution(workouts);
    const volumeSparkline    = buildVolumeSparkline(progress?.volumePerWorkout ?? []);

    return { totalVolume, totalSets, featured, isScheduledToday: Boolean(scheduledToday), muscleDistribution, volumeSparkline };
  }, [workouts, progress]);

  // Hooks não podem ser condicionais: chamados aqui, antes dos returns antecipados
  // abaixo, com fallback 0 quando `stats` ainda é null (loading/vazio/erro).
  const [skipIntro] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(DASHBOARD_INTRO_SEEN_KEY) === "true"
  );
  useEffect(() => {
    if (typeof window !== "undefined") sessionStorage.setItem(DASHBOARD_INTRO_SEEN_KEY, "true");
  }, []);

  // Escalonados (~70ms entre si) pra não disparar os 4 juntos — leitura de
  // "boot sequence", não de flash único. `skip` pula tudo na 2ª visita da sessão.
  const workoutsCount = useCountUp(workouts.length, { skip: skipIntro, delayMs: 0 });
  const volumeCount   = useCountUp(stats?.totalVolume ?? 0, { skip: skipIntro, delayMs: 70 });
  const setsCount     = useCountUp(stats?.totalSets ?? 0, { skip: skipIntro, delayMs: 140 });
  const avgCount      = useCountUp(workouts.length > 0 ? (stats?.totalSets ?? 0) / workouts.length : 0, { skip: skipIntro, delayMs: 210 });
  const animatedWorkoutsCount = Math.round(workoutsCount.value);
  const animatedVolume = volumeCount.value;
  const animatedSets = Math.round(setsCount.value);
  const animatedAvg = Math.round(avgCount.value);

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 400 }}
      >
        <Loader2 size={36} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 13, color: "var(--text-dim)" }}>A carregar os teus treinos…</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Erro (ex: token ainda não pronto logo após login OAuth, falha de rede) é
  // um estado diferente de "genuinamente sem treinos" — mostrar a mesma tela
  // de "crie seu primeiro treino" quando o fetch falhou engana um usuário
  // que já tem treinos reais, sugerindo que ele recrie tudo do zero.
  if (!loading && error) {
    // A mensagem técnica (`error`) não é copy curada — pode vir crua do
    // backend ou de uma falha de rede em inglês. Fica só nos logs.
    console.error("[Dashboard] erro ao carregar treinos:", error);
    return (
      <div className="anim-up">
        <div className="page-head">
          <div>
            <div className="h-eyebrow" style={{ marginBottom: 8 }}>
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <h1 className="page-title">{greeting}, <em style={{ color: "var(--accent)", fontStyle: "italic" }}>{firstName}</em> 👋</h1>
          </div>
        </div>

        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div className="auth-status-icon auth-status-icon-danger" style={{ margin: "0 auto 16px" }}><AlertCircle size={28} /></div>
          <div className="h-display" style={{ fontSize: 22, marginBottom: 8 }}>Não foi possível carregar seus treinos</div>
          <p style={{ color: "var(--text-dim)", marginBottom: 28 }}>
            Verifique sua conexão e tente novamente. Se o problema persistir, tente entrar na sua conta novamente.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => reload()}>
            <RefreshCw size={16} /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!loading && workouts.length === 0) {
    return (
      <div className="anim-up">
        <div className="page-head">
          <div>
            <div className="h-eyebrow" style={{ marginBottom: 8 }}>
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <h1 className="page-title">{greeting}, <em style={{ color: "var(--accent)", fontStyle: "italic" }}>{firstName}</em> 👋</h1>
            <div className="page-sub">Vamos começar sua jornada.</div>
          </div>
        </div>

        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div className="auth-status-icon" style={{ margin: "0 auto 16px" }}><Dumbbell size={28} /></div>
          <div className="h-display" style={{ fontSize: 22, marginBottom: 8 }}>Nenhum treino cadastrado</div>
          <p style={{ color: "var(--text-dim)", marginBottom: 28 }}>
            Crie seu primeiro treino ou deixe a IA montar um plano sob medida.
          </p>
          <div className="row gap-3" style={{ justifyContent: "center" }}>
            <Link href="/treinos" className="btn btn-primary btn-lg">
              <Dumbbell size={16} /> Criar treino
            </Link>
            <Link href="/ai-gen" className="btn btn-secondary btn-lg">
              <Sparkles size={16} /> Gerar com IA
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { totalVolume, featured, isScheduledToday, muscleDistribution, volumeSparkline } = stats!;

  // Dias da semana atual em que o usuário realmente treinou
  const trainedDays = new Set(
    sessions.map(s => DAY_NAMES[new Date(s.executedAt).getDay()])
  );

  // O modo k-suffix é decidido pelo valor final (não pelo intermediário da
  // animação), senão o "k" piscaria entrando e saindo enquanto conta.
  const volumeDisplay = totalVolume >= 1000
    ? `${(animatedVolume / 1000).toFixed(1)}k`
    : animatedVolume.toFixed(0);

  return (
    <div className="anim-up">

      {/* ── Cabeçalho da página ── */}
      <div className="page-head">
        <div>
          <div className="h-eyebrow" style={{ marginBottom: 8 }}>
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <h1 className="page-title">{greeting}, <em style={{ color: "var(--accent)", fontStyle: "italic" }}>{firstName}</em> 👋</h1>
          <div className="page-sub">
            {workouts.length > 0
              ? `Você tem ${workouts.length} treino${workouts.length !== 1 ? "s" : ""} cadastrado${workouts.length !== 1 ? "s" : ""}. Hora de mover ferro.`
              : "Hora de começar."}
          </div>
        </div>
      </div>

      {/* ── Cards de stats ── */}
      {/* Volume total lidera (o dado que mais conta pro "track truth" do
          produto — ver PRODUCT.md) em vez dos 4 tiles do mesmo tamanho e peso
          disputando atenção igual. Os outros 3 ficam quietos ao redor, texto
          menor, sem sparkline — apoiam, não competem. */}
      <div className="grid-cols-4" style={{ gap: 16, marginBottom: 24 }}>
        <div className="card card-accent" style={{ gridColumn: "span 2" }}>
          <div className="stat-label">Volume total</div>
          <div style={{ marginTop: 10 }}>
            <span className="stat-num" style={{ fontSize: 40, ...(volumeCount.done ? {} : { fontFamily: "var(--font-mono)" }) }}>{volumeDisplay}</span>
            <span className="stat-unit"> kg</span>
          </div>
          <div style={{ marginTop: 14, marginLeft: -4 }}>
            <Sparkline data={volumeSparkline} width={300} height={40} pulse pulseDelayMs={skipIntro ? 0 : 800} />
          </div>
        </div>

        <div className="col gap-2" style={{ gridColumn: "span 2" }}>
          <div className="card card-tight row between" style={{ alignItems: "baseline" }}>
            <div className="stat-label">Treinos</div>
            <div>
              {/* Mono só enquanto ainda está a contar — assentado, volta pra Space
                  Grotesk (o `.stat-num` por defeito), igual ao resto do sistema. */}
              <span className="stat-num" style={{ fontSize: 20, ...(workoutsCount.done ? {} : { fontFamily: "var(--font-mono)" }) }}>{animatedWorkoutsCount}</span>
              <span className="stat-unit"> planos</span>
            </div>
          </div>
          <div className="card card-tight row between" style={{ alignItems: "baseline" }}>
            <div className="stat-label">Total de séries</div>
            <div>
              <span className="stat-num" style={{ fontSize: 20, ...(setsCount.done ? {} : { fontFamily: "var(--font-mono)" }) }}>{animatedSets}</span>
              <span className="stat-unit"> séries</span>
            </div>
          </div>
          <div className="card card-tight row between" style={{ alignItems: "baseline" }}>
            <div className="stat-label">Média / treino</div>
            <div>
              <span className="stat-num" style={{ fontSize: 20, ...(avgCount.done ? {} : { fontFamily: "var(--font-mono)" }) }}>{animatedAvg}</span>
              <span className="stat-unit"> séries</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grid principal ── */}
      <div className="grid-3">
        {/* Coluna esquerda */}
        <div className="col-stack">

          {/* Hero: treino em destaque */}
          <div className="card card-accent tech-grid glow-live"
            style={{ padding: 28, position: "relative", overflow: "hidden", animationDelay: skipIntro ? "0s" : "800ms" }}>
            <Image src={heroStrongman} alt="" aria-hidden="true" className="dashboard-hero-figure" />
            <HudCorners />
            <div className="row gap-4" style={{ position: "relative", zIndex: 1 }}>
              <div style={{ flex: 1 }}>
                <div className="h-eyebrow" style={{ color: "var(--accent)" }}>{isScheduledToday ? "Treino de hoje" : "Treino em destaque"}</div>
                <h2 className="h-display" style={{ fontSize: 36, margin: "12px 0 16px" }}>{featured.name}</h2>
                <div className="row gap-4" style={{ color: "var(--text-dim)", fontSize: 14, marginBottom: 24 }}>
                  <div className="row gap-2"><Timer size={16} /> {featured.duration} min</div>
                  <div className="row gap-2"><Dumbbell size={16} /> {featured.exercises.length} exercícios</div>
                  <div className="row gap-2"><Target size={16} /> {featured.totalSets} séries</div>
                </div>
                <Link href={`/treinos/${featured.id}`} className="btn btn-primary btn-lg">
                  <Play size={14} fill="currentColor" /> Começar treino
                </Link>
              </div>
              {/* Dias programados */}
              <div style={{ width: 200 }}>
                <h3 className="h-eyebrow" style={{ marginBottom: 12 }}>Treinado esta semana</h3>
                {/* Estados próprios (não os de `useWorkouts`): sem isto, um fetch de
                    sessões ainda em curso ou falhado renderizava "–" em todos os dias,
                    indistinguível de uma semana genuinamente sem treinos. */}
                {sessionsLoading ? (
                  <p style={{ fontSize: 12, color: "var(--text-mute)" }}>A verificar sessões…</p>
                ) : sessionsError ? (
                  <p style={{ fontSize: 12, color: "var(--text-mute)" }}>Não foi possível confirmar as sessões desta semana.</p>
                ) : (
                  // Mesma linguagem visual do dia "treinado" no /calendario
                  // (gain-soft + borda --accent) — em vez de uma barra de
                  // progresso genérica por dia, que não significava nada
                  // além de "ligado/desligado".
                  <div className="row gap-1" style={{ justifyContent: "space-between" }}>
                    {WEEK_DAYS.map(d => {
                      const active = trainedDays.has(d);
                      return (
                        <div key={d} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: "50%",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: active ? "var(--gain-soft)" : "transparent",
                            border: active ? "1.5px solid var(--accent)" : "1px dashed var(--border-soft)",
                          }}>
                            {active
                              ? <Check size={11} color="var(--accent)" strokeWidth={3} />
                              : <span style={{ fontSize: 9, color: "var(--text-mute)" }}>{d[0]}</span>
                            }
                          </div>
                          <span style={{ fontSize: 9, color: "var(--text-mute)" }}>{d}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lista de treinos */}
          <div>
            <div className="row between" style={{ marginBottom: 12 }}>
              <h3 className="h-display" style={{ fontSize: 18 }}>Meus treinos</h3>
              <Link href="/treinos" style={{ fontSize: 13, color: "var(--text-dim)" }}>Ver tudo</Link>
            </div>
            <div className="grid-cols-2" style={{ gap: 12 }}>
              {workouts.slice(0, 4).map(w => (
                <Link key={w.id} href={`/treinos/${w.id}`} className="card card-tight" style={{ display: "block" }}>
                  <div className="row gap-3">
                    <div style={{
                      width: 44, height: 44, borderRadius: 11,
                      background: "var(--surface-2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--accent)",
                    }}>{w.code}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{w.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>
                        {w.duration} min · {w.exercises.length} ex{w.schedule ? ` · ${w.schedule}` : ""}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna direita */}
        <div className="col-stack">
          {/* Sugestão da IA — card simples, sem cantos HUD/grelha/ponto "ao vivo":
              o texto aqui é uma regra local (workouts.length), não uma chamada
              real à IA — vestir isso de "dado computado ao vivo" seria fabricar
              um sinal que o card não tem. Esse vocabulário fica reservado ao
              hero e ao card de PRs, que mostram dado genuinamente real. */}
          <div className="card">
            <div className="row gap-2" style={{ marginBottom: 12, alignItems: "center" }}>
              <Sparkles size={16} color="var(--accent)" />
              <h3 className="h-eyebrow" style={{ color: "var(--accent)", margin: 0 }}>Sugestão da IA</h3>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 16 }}>
              {workouts.length < 3
                ? "Você tem poucos treinos cadastrados. Que tal deixar a IA montar um plano completo para você?"
                : `Você tem ${workouts.length} treinos cadastrados. Considere adicionar um dia de recuperação ativa ou mobilidade.`}
            </div>
            <div className="row gap-2">
              <Link href="/ai-gen" className="btn btn-primary btn-sm flex-1" style={{ justifyContent: "center" }}>
                Gerar com IA
              </Link>
              <Link href="/treinos" className="btn btn-ghost btn-sm">Ver treinos</Link>
            </div>
          </div>

          {/* Recordes pessoais — usa a mesma regra de PR de progresso/page.tsx (delta > 0, com sessão anterior pra comparar) */}
          <div className="card card-gain" style={{ position: "relative" }}>
            <HudCorners color="var(--gain)" size={11} inset={8} />
            <div className="row between" style={{ marginBottom: 14 }}>
              <h3 className="h-eyebrow" style={{ color: "var(--gain)", margin: 0 }}>Recordes recentes</h3>
              <Trophy size={16} color="var(--gain)" />
            </div>
            {prs.length > 0 ? (
              <div className="col gap-3">
                {prs.slice(0, 3).map(pr => (
                  <div key={pr.name} className="row between" style={{ fontSize: 13 }}>
                    <span>{pr.name}</span>
                    <span className="h-mono" style={{ color: "var(--gain)" }}>+{pr.delta.toFixed(1)} kg</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-mute)" }}>
                Ainda sem recordes registrados — treine o mesmo exercício duas vezes pra ver o seu primeiro PR aqui.
              </p>
            )}
          </div>

          {/* Foco muscular */}
          <div className="card">
            <h3 className="h-eyebrow" style={{ marginBottom: 14 }}>Foco muscular</h3>
            {muscleDistribution.length > 0 ? (
              <div className="col gap-3">
                {muscleDistribution.map(r => (
                  <div key={r.label}>
                    <div className="row between" style={{ fontSize: 13, marginBottom: 6 }}>
                      <span>{r.label}</span>
                      <span className="h-mono" style={{ color: "var(--text-mute)" }}>{r.value}%</span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ transform: `scaleX(${r.value / 100})` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-mute)" }}>
                Adicione exercícios para ver a distribuição muscular.
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
