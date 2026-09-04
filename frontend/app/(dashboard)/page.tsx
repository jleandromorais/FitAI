"use client";

import Link from "next/link";
import { Play, Timer, Dumbbell, Target, Sparkles, Trophy, TrendingUp, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Sparkline } from "@/components/ui/Charts";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useProgress } from "@/hooks/useProgress";
import { useSessions } from "@/hooks/useSessions";
import { useMemo } from "react";
import type { Workout } from "@/hooks/useWorkouts";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de cálculo
// ─────────────────────────────────────────────────────────────────────────────

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

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

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "atleta";

  const { workouts, loading, error, reload } = useWorkouts();
  const { data: progress } = useProgress();
  const { sessions } = useSessions(7);

  const stats = useMemo(() => {
    if (workouts.length === 0) return null;

    const totalVolume = progress?.totalVolume ?? workouts.reduce((sum, w) => sum + (w.volume ?? 0), 0);
    const totalSets   = progress?.totalSetsCompleted ?? workouts.reduce((sum, w) => sum + (w.totalSets ?? 0), 0);
    const featured    = [...workouts].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))[0];
    const muscleDistribution = calcMuscleDistribution(workouts);
    const volumeSparkline    = buildVolumeSparkline(progress?.volumePerWorkout ?? []);

    return { totalVolume, totalSets, featured, muscleDistribution, volumeSparkline };
  }, [workouts, progress]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <Loader2 size={36} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Erro (ex: token ainda não pronto logo após login OAuth, falha de rede) é
  // um estado diferente de "genuinamente sem treinos" — mostrar a mesma tela
  // de "crie seu primeiro treino" quando o fetch falhou engana um usuário que
  // já tem treinos reais, sugerindo que ele recrie tudo do zero.
  if (!loading && error) {
    return (
      <div className="anim-up">
        <div className="page-head">
          <div>
            <div className="h-eyebrow" style={{ marginBottom: 8 }}>
              {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            <h1 className="page-title">Bom dia, {firstName} 👋</h1>
          </div>
        </div>

        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div className="auth-status-icon" style={{ margin: "0 auto 16px" }}><AlertCircle size={28} color="var(--danger)" /></div>
          <div className="h-display" style={{ fontSize: 22, marginBottom: 8 }}>Não foi possível carregar seus treinos</div>
          <p style={{ color: "var(--text-dim)", marginBottom: 28 }}>{error}</p>
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
            <h1 className="page-title">Bom dia, {firstName} 👋</h1>
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

  const { totalVolume, totalSets, featured, muscleDistribution, volumeSparkline } = stats!;

  // Dias da semana atual em que o usuário realmente treinou
  const trainedDays = new Set(
    sessions.map(s => {
      const d = new Date(s.executedAt).getDay(); // 0=Dom,1=Seg...
      return ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][d];
    })
  );

  return (
    <div className="anim-up">

      {/* ── Cabeçalho da página ── */}
      <div className="page-head">
        <div>
          <div className="h-eyebrow" style={{ marginBottom: 8 }}>
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </div>
          <h1 className="page-title">Bom dia, {firstName} 👋</h1>
          <div className="page-sub">
            {workouts.length > 0
              ? `Você tem ${workouts.length} treino${workouts.length !== 1 ? "s" : ""} cadastrado${workouts.length !== 1 ? "s" : ""}. Hora de mover ferro.`
              : "Hora de começar."}
          </div>
        </div>
      </div>

      {/* ── Cards de stats ── */}
      <div className="grid-cols-4" style={{ gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div className="stat-label">Treinos</div>
          <div style={{ marginTop: 10 }}>
            <span className="stat-num">{workouts.length}</span>
            <span className="stat-unit"> planos</span>
          </div>
        </div>

        <div className="card">
          <div className="stat-label">Volume total</div>
          <div style={{ marginTop: 10 }}>
            <span className="stat-num">
              {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume.toFixed(0)}
            </span>
            <span className="stat-unit"> kg</span>
          </div>
          <div style={{ marginTop: 14, marginLeft: -4 }}>
            <Sparkline data={volumeSparkline} width={220} height={36} />
          </div>
        </div>

        <div className="card">
          <div className="stat-label">Total de séries</div>
          <div style={{ marginTop: 10 }}>
            <span className="stat-num">{totalSets}</span>
            <span className="stat-unit"> séries</span>
          </div>
        </div>

        <div className="card">
          <div className="stat-label">Média / treino</div>
          <div style={{ marginTop: 10 }}>
            <span className="stat-num">
              {workouts.length > 0 ? Math.round(totalSets / workouts.length) : 0}
            </span>
            <span className="stat-unit"> séries</span>
          </div>
        </div>
      </div>

      {/* ── Grid principal ── */}
      <div className="grid-3">
        {/* Coluna esquerda */}
        <div className="col-stack">

          {/* Hero: treino em destaque */}
          <div className="card card-accent" style={{ padding: 28 }}>
            <div className="row gap-4">
              <div style={{ flex: 1 }}>
                <div className="h-eyebrow" style={{ color: "var(--accent)" }}>Treino em destaque</div>
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
                <div className="h-eyebrow" style={{ marginBottom: 12 }}>Treinado esta semana</div>
                <div className="col gap-2">
                  {WEEK_DAYS.map(d => {
                    const active = trainedDays.has(d);
                    return (
                      <div key={d} className="row between" style={{ fontSize: 12 }}>
                        <span style={{ color: "var(--text-mute)", width: 32 }}>{d}</span>
                        <div className="bar-track flex-1" style={{ marginLeft: 12 }}>
                          <div className="bar-fill" style={{ transform: active ? "scaleX(1)" : "scaleX(0)" }} />
                        </div>
                        <span style={{
                          color: active ? "var(--accent)" : "var(--text-mute)",
                          width: 28, textAlign: "right",
                          fontFamily: "var(--font-mono)", fontSize: 11,
                        }}>
                          {active ? "✓" : "–"}
                        </span>
                      </div>
                    );
                  })}
                </div>
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
          {/* Sugestão da IA */}
          <div className="card card-accent">
            <div className="row gap-2" style={{ marginBottom: 12 }}>
              <Sparkles size={16} color="var(--accent)" />
              <div className="h-eyebrow" style={{ color: "var(--accent)" }}>Sugestão da IA</div>
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

          {/* Maior volume */}
          <div className="card">
            <div className="row between" style={{ marginBottom: 14 }}>
              <div className="h-eyebrow">Maior volume</div>
              <Trophy size={16} color="var(--accent)" />
            </div>
            <div className="h-display" style={{ fontSize: 28 }}>
              {featured.volume >= 1000
                ? `${(featured.volume / 1000).toFixed(1)}k`
                : featured.volume?.toFixed(0) ?? "–"} kg
            </div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>{featured.name}</div>
            {featured.tags?.length > 0 && (
              <div className="row gap-2" style={{ marginTop: 14 }}>
                {featured.tags.map(t => (
                  <span key={t} className="chip chip-accent">{t}</span>
                ))}
              </div>
            )}
          </div>

          {/* Foco muscular */}
          <div className="card">
            <div className="h-eyebrow" style={{ marginBottom: 14 }}>Foco muscular</div>
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

          {/* Volume trend */}
          <div className="card">
            <div className="row between" style={{ marginBottom: 12 }}>
              <div className="h-eyebrow">Volume acumulado</div>
              <TrendingUp size={16} color="var(--accent)" />
            </div>
            <div className="h-display" style={{ fontSize: 22 }}>
              {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume.toFixed(0)}
              <span className="stat-unit"> kg</span>
            </div>
            <div style={{ marginTop: 16 }}>
              <Sparkline data={volumeSparkline} width={280} height={48} />
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
