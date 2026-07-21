"use client";

import { useState } from "react";
import { Loader2, Dumbbell } from "lucide-react";
import { useProgress } from "@/hooks/useProgress";
import { useSessions } from "@/hooks/useSessions";
import { useProgressStats } from "@/hooks/useProgressStats";
import ForcaTab from "@/components/ui/ForcaTab";
import VolumeTab from "@/components/ui/VolumeTab";
import RecordesTab from "@/components/ui/RecordesTab";
import Link from "next/link";

/** Formata volume: 1500 → "1.5k", 850 → "850" */
function fmtVol(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);
}

export default function ProgressoPage() {
  const { data, loading, error } = useProgress();
  const { sessions } = useSessions(90);

  // Aba activa: força | volume | prs
  const [tab, setTab] = useState("forca");

  // Exercício seleccionado na aba Força (índice na lista)
  const [exIdx, setExIdx] = useState(0);

  // Momento de referência para os cálculos de "esta semana" — capturado uma vez
  // por sessão de página (lazy initializer é a forma pura de ler Date.now() no render).
  const [now] = useState(() => Date.now());

  const { exercisesWithLoad, selectedEx, loadHistory, prs, volumeStats, muscleBreakdown, topExercisesByVolume } =
    useProgressStats(data, sessions, exIdx, now);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <Loader2 size={36} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Erro ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="anim-up">
        <div className="page-head">
          <div>
            <h1 className="page-title">Evolução</h1>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
          <div className="h-display" style={{ fontSize: 18, marginBottom: 8 }}>
            Não foi possível carregar o progresso
          </div>
          <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 8 }}>{error}</p>
          <p style={{ color: "var(--text-mute)", fontSize: 12, marginBottom: 24 }}>
            Verifique se o backend está a correr e reinicie-o se necessário.
          </p>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // ── Estado vazio: nenhum treino ou nenhuma sessão feita ainda ──────────────
  const hasSessions = data && data.exercises.some(e => e.prevWeight > 0);

  if (!data || !hasSessions) {
    return (
      <div className="anim-up">
        <div className="page-head">
          <div>
            <h1 className="page-title">Evolução</h1>
            <div className="page-sub">Acompanhe seu progresso</div>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📈</div>
          <div className="h-display" style={{ fontSize: 20, marginBottom: 8 }}>Sem dados ainda</div>
          <p style={{ color: "var(--text-dim)", marginBottom: 28 }}>
            Execute pelo menos um treino para ver sua evolução aqui.
          </p>
          <Link href="/treinos" className="btn btn-primary">
            <Dumbbell size={16} /> Ir para treinos
          </Link>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="anim-up">

      {/* Cabeçalho */}
      <div className="page-head">
        <div>
          <h1 className="page-title">Evolução</h1>
          <div className="page-sub">
            {data.totalWorkouts} treino{data.totalWorkouts !== 1 ? "s" : ""} ·{" "}
            {data.totalSetsCompleted} séries concluídas ·{" "}
            {fmtVol(data.totalVolume)} kg volume total
          </div>
        </div>

        {/* Abas */}
        <div className="tabs">
          {[["forca", "Força"], ["volume", "Volume"], ["prs", "Recordes"]].map(([id, l]) => (
            <div key={id} className={`tab${tab === id ? " active" : ""}`} onClick={() => setTab(id)}>
              {l}
            </div>
          ))}
        </div>
      </div>

      {/* ── Cards de stats globais (sempre visíveis) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div className="stat-label">Volume total</div>
          <div style={{ marginTop: 10 }}>
            <span className="stat-num">{fmtVol(data.totalVolume)}</span>
            <span className="stat-unit"> kg</span>
          </div>
          <div style={{ fontSize: 11, marginTop: 6, fontWeight: 600, color: "var(--accent)" }}>acumulado</div>
        </div>
        <div className="card">
          <div className="stat-label">Séries concluídas</div>
          <div style={{ marginTop: 10 }}>
            <span className="stat-num">{data.totalSetsCompleted}</span>
          </div>
          <div style={{ fontSize: 11, marginTop: 6, fontWeight: 600, color: "var(--accent)" }}>
            em {data.totalWorkouts} treino{data.totalWorkouts !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Exercícios</div>
          <div style={{ marginTop: 10 }}>
            <span className="stat-num">{data.exercises.length}</span>
          </div>
          <div style={{ fontSize: 11, marginTop: 6, fontWeight: 600, color: "var(--accent)" }}>
            {prs.length} com ganho de carga
          </div>
        </div>
      </div>

      {tab === "forca" && (
        <ForcaTab
          data={data}
          exercisesWithLoad={exercisesWithLoad}
          selectedEx={selectedEx}
          loadHistory={loadHistory}
          exIdx={exIdx}
          onSelectExercise={setExIdx}
        />
      )}

      {tab === "volume" && (
        <VolumeTab
          data={data}
          sessions={sessions}
          weekVolume={volumeStats.weekVolume}
          avgVolume={volumeStats.avgVolume}
          sessionVolumes={volumeStats.sessionVolumes}
          muscleBreakdown={muscleBreakdown}
          topExercisesByVolume={topExercisesByVolume}
        />
      )}

      {tab === "prs" && <RecordesTab prs={prs} />}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
