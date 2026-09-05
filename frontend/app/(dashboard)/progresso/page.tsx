"use client";

import { useState } from "react";
import { Loader2, Dumbbell, AlertTriangle, TrendingUp } from "lucide-react";
import { useProgress } from "@/hooks/useProgress";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSessions } from "@/hooks/useSessions";
import { useProgressStats } from "@/hooks/useProgressStats";
import ForcaTab from "@/components/ui/ForcaTab";
import VolumeTab from "@/components/ui/VolumeTab";
import RecordesTab from "@/components/ui/RecordesTab";
import FotosTab from "@/components/ui/FotosTab";
import Link from "next/link";
import { fmtVol } from "@/lib/format";

export default function ProgressoPage() {
  const { t } = useLanguage();
  const { data, loading, error } = useProgress();
  const { sessions } = useSessions(90);

  // Aba activa: força | volume | prs | fotos
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
      <div
        role="status"
        aria-live="polite"
        style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 400 }}
      >
        <Loader2 size={36} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 13, color: "var(--text-dim)" }}>{t.progresso.carregando}</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Erro ───────────────────────────────────────────────────────────────────
  if (error) {
    // A mensagem técnica (`error`) não é copy curada — pode vir crua do
    // backend ou de uma falha de rede em inglês. Fica só nos logs.
    console.error("[Progresso] erro ao carregar progresso:", error);
    return (
      <div className="anim-up">
        <div className="page-head">
          <div>
            <h1 className="page-title">{t.progresso.titulo}</h1>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div className="auth-status-icon auth-status-icon-danger" style={{ margin: "0 auto 16px" }}><AlertTriangle size={22} /></div>
          <div className="h-display" style={{ fontSize: 18, marginBottom: 8 }}>
            {t.progresso.erroTitulo}
          </div>
          <p style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 24 }}>
            {t.progresso.erroTexto}
          </p>
          <button className="btn btn-secondary" onClick={() => window.location.reload()}>
            {t.progresso.tentarNovamente}
          </button>
        </div>
      </div>
    );
  }

  // Um utilizador que acabou de fazer o primeiro treino já tem dados reais
  // (totalVolume, totalSets) — só ainda não tem um SEGUNDO ponto de
  // comparação por exercício. As abas força/volume/prs mostram o prompt "sem
  // dados" enquanto isso. Fotos de evolução são independentes de ter treino
  // registado — não faz sentido bloquear alguém de guardar a primeira foto
  // só porque ainda não treinou, por isso segue direto pro FotosTab abaixo.
  const hasWorkoutData = !!data && data.totalWorkouts > 0;
  const TABS: [string, string][] = [
    ["forca", t.progresso.abaForca],
    ["volume", t.progresso.abaVolume],
    ["prs", t.progresso.abaRecordes],
    ["fotos", t.progresso.abaFotos],
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="anim-up">

      {/* Cabeçalho */}
      <div className="page-head">
        <div>
          <h1 className="page-title">{t.progresso.titulo}</h1>
          <div className="page-sub">
            {hasWorkoutData
              ? t.progresso.resumo(data!.totalWorkouts, data!.totalSetsCompleted, fmtVol(data!.totalVolume))
              : t.progresso.subtitulo}
          </div>
        </div>

        {/* Abas — aria-controls/id ligam cada botão ao seu painel, senão um
            leitor de ecrã não sabe qual conteúdo pertence a qual aba. */}
        <div className="tabs" role="tablist">
          {TABS.map(([id, l]) => (
            <button
              key={id}
              id={`tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              className={`tab${tab === id ? " active" : ""}`}
              onClick={() => setTab(id)}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {tab === "fotos" ? (
        <div role="tabpanel" id="panel-fotos" aria-labelledby="tab-fotos">
          <FotosTab />
        </div>
      ) : !hasWorkoutData ? (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div className="auth-status-icon" style={{ margin: "0 auto 16px" }}><TrendingUp size={26} /></div>
          <div className="h-display" style={{ fontSize: 20, marginBottom: 8 }}>{t.progresso.semDados}</div>
          <p style={{ color: "var(--text-dim)", marginBottom: 28 }}>
            {t.progresso.executePeloMenos}
          </p>
          <Link href="/treinos" className="btn btn-primary">
            <Dumbbell size={16} /> {t.progresso.irParaTreinos}
          </Link>
        </div>
      ) : (
        <>
          {/* ── Cards de stats globais (sempre visíveis) ── */}
          {/* Volume total lidera — é o que "track truth" mede de mais amplo — em
              vez de 3 tiles do mesmo peso disputando atenção igual. */}
          <div className="grid-cols-3" style={{ gap: 16, marginBottom: 24 }}>
            <div className="card card-accent">
              <div className="stat-label">{t.progresso.volumeTotal}</div>
              <div style={{ marginTop: 10 }}>
                <span className="stat-num" style={{ fontSize: 38 }}>{fmtVol(data!.totalVolume)}</span>
                <span className="stat-unit"> kg</span>
              </div>
              <div style={{ fontSize: 11, marginTop: 6, fontWeight: 600, color: "var(--accent)" }}>{t.progresso.acumulado}</div>
            </div>
            <div className="card card-tight">
              <div className="stat-label">{t.progresso.seriesConcluidas}</div>
              <div style={{ marginTop: 8 }}>
                <span className="stat-num" style={{ fontSize: 22 }}>{data!.totalSetsCompleted}</span>
              </div>
              <div style={{ fontSize: 11, marginTop: 4, color: "var(--text-mute)" }}>
                {t.progresso.em} {data!.totalWorkouts} {t.progresso.treino(data!.totalWorkouts)}
              </div>
            </div>
            <div className="card card-tight">
              <div className="stat-label">{t.progresso.exercicios}</div>
              <div style={{ marginTop: 8 }}>
                <span className="stat-num" style={{ fontSize: 22 }}>{data!.exercises.length}</span>
              </div>
              <div style={{ fontSize: 11, marginTop: 4, color: "var(--text-mute)" }}>
                {prs.length} {t.progresso.comGanhoDeCarga}
              </div>
            </div>
          </div>

          {tab === "forca" && (
            <div role="tabpanel" id="panel-forca" aria-labelledby="tab-forca">
              <ForcaTab
                data={data!}
                exercisesWithLoad={exercisesWithLoad}
                selectedEx={selectedEx}
                loadHistory={loadHistory}
                exIdx={exIdx}
                onSelectExercise={setExIdx}
              />
            </div>
          )}

          {tab === "volume" && (
            <div role="tabpanel" id="panel-volume" aria-labelledby="tab-volume">
              <VolumeTab
                data={data!}
                sessions={sessions}
                weekVolume={volumeStats.weekVolume}
                avgVolume={volumeStats.avgVolume}
                sessionVolumes={volumeStats.sessionVolumes}
                muscleBreakdown={muscleBreakdown}
                topExercisesByVolume={topExercisesByVolume}
              />
            </div>
          )}

          {tab === "prs" && (
            <div role="tabpanel" id="panel-prs" aria-labelledby="tab-prs">
              <RecordesTab prs={prs} />
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
