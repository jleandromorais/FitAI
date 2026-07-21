"use client";

import Link from "next/link";
import { TrendingUp, Flame, BarChart2, Trophy } from "lucide-react";
import { LineChart, BarChart } from "@/components/ui/Charts";
import { ProgressData } from "@/hooks/useProgress";
import { SessionHistory } from "@/hooks/useSessions";
import { ExerciseVolumeEntry, MuscleVolumeEntry } from "@/hooks/useProgressStats";

/** Formata volume: 1500 → "1.5k", 850 → "850" */
function fmtVol(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);
}

interface VolumeTabProps {
  data: ProgressData | null;
  sessions: SessionHistory[];
  weekVolume: number;
  avgVolume: number;
  sessionVolumes: number[];
  muscleBreakdown: MuscleVolumeEntry[];
  topExercisesByVolume: ExerciseVolumeEntry[];
}

export default function VolumeTab({
  data, sessions, weekVolume, avgVolume, sessionVolumes, muscleBreakdown, topExercisesByVolume,
}: VolumeTabProps) {
  const maxMuscleVol = muscleBreakdown[0]?.volume || 1;
  const maxExVol = topExercisesByVolume[0]?.vol || 1;

  const hasSessionData = sessions.length > 0;
  const hasVolumeData = data && data.volumePerWorkout.some(v => v > 0);

  if (!hasSessionData && !hasVolumeData) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <TrendingUp size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
        <div style={{ fontSize: 14, color: "var(--text-mute)" }}>Execute treinos para ver o volume acumulado.</div>
        <Link href="/treinos" className="btn btn-primary" style={{ marginTop: 20 }}>Ir para treinos</Link>
      </div>
    );
  }

  return (
    <div className="col-stack">
      {/* Stats rápidos */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
        {[
          { label: "Volume total", val: fmtVol(data?.totalVolume ?? 0), unit: "kg", icon: <TrendingUp size={16} color="var(--accent)" /> },
          { label: "Esta semana", val: fmtVol(weekVolume), unit: "kg", icon: <Flame size={16} color="var(--accent)" /> },
          { label: "Sessões", val: String(sessions.length), unit: "", icon: <BarChart2 size={16} color="var(--accent)" /> },
          { label: "Média/sessão", val: fmtVol(avgVolume), unit: "kg", icon: <Trophy size={16} color="var(--accent)" /> },
        ].map(c => (
          <div key={c.label} className="card">
            <div className="row between" style={{ marginBottom: 10 }}>
              <div className="stat-label">{c.label}</div>
              {c.icon}
            </div>
            <div>
              <span className="stat-num">{c.val}</span>
              <span className="stat-unit"> {c.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-3">
        <div className="col-stack">
          {/* Gráfico de linha por sessão */}
          {sessionVolumes.length >= 2 ? (
            <div className="card">
              <div className="row between" style={{ marginBottom: 16 }}>
                <div>
                  <div className="h-eyebrow">Volume por sessão</div>
                  <div className="h-display" style={{ fontSize: 28, marginTop: 6 }}>
                    {fmtVol(sessionVolumes[sessionVolumes.length - 1])}<span className="stat-unit">kg</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-mute)", textAlign: "right" }}>
                  Últimas {sessionVolumes.length} sessões
                </div>
              </div>
              <LineChart data={sessionVolumes} height={200} yLabel={v => `${fmtVol(v)}kg`} showDots />
            </div>
          ) : data && data.volumePerWorkout.some(v => v > 0) ? (
            <div className="card">
              <div className="row between" style={{ marginBottom: 16 }}>
                <div>
                  <div className="h-eyebrow">Volume por treino</div>
                  <div className="h-display" style={{ fontSize: 28, marginTop: 6 }}>
                    {fmtVol(data.totalVolume)}<span className="stat-unit">kg</span>
                  </div>
                </div>
              </div>
              <BarChart data={data.volumePerWorkout} height={200} />
              <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap" }}>
                {data.workoutLabels.map((l, i) => (
                  <div key={i} style={{ fontSize: 11, color: "var(--text-mute)" }}>
                    <span style={{ fontWeight: 700, color: "var(--accent)" }}>{l.split("—")[0]?.trim()}</span>
                    {" · "}{fmtVol(data.volumePerWorkout[i])}kg
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Sessões recentes */}
          {sessions.length > 0 && (
            <div className="card">
              <div className="h-eyebrow" style={{ marginBottom: 14 }}>Sessões recentes</div>
              <div className="col gap-3">
                {sessions.slice(0, 6).map((s, i) => (
                  <div key={i} className="row between">
                    <div className="row gap-3">
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, background: "var(--accent-soft)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: 12, color: "var(--accent)", flexShrink: 0,
                      }}>{s.workoutCode}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{s.workoutName}</div>
                        <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 1 }}>
                          {new Date(s.executedAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                          {s.durationMinutes ? ` · ${s.durationMinutes} min` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="h-mono" style={{ fontSize: 13, fontWeight: 700 }}>
                      {fmtVol(s.totalVolume ?? 0)}kg
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna direita */}
        <div className="col-stack">
          {/* Volume por grupo muscular */}
          {muscleBreakdown.length > 0 && (
            <div className="card">
              <div className="h-eyebrow" style={{ marginBottom: 14 }}>Por grupo muscular</div>
              <div className="col gap-3">
                {muscleBreakdown.slice(0, 7).map(({ muscle, volume }) => (
                  <div key={muscle}>
                    <div className="row between" style={{ fontSize: 13, marginBottom: 6 }}>
                      <span>{muscle}</span>
                      <span className="h-mono" style={{ color: "var(--text-mute)", fontSize: 11 }}>
                        {fmtVol(volume)}kg
                      </span>
                    </div>
                    <div className="bar-track">
                      <div className="bar-fill" style={{ width: `${(volume / maxMuscleVol) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top exercícios */}
          {topExercisesByVolume.length > 0 && (
            <div className="card">
              <div className="h-eyebrow" style={{ marginBottom: 14 }}>Top exercícios</div>
              <div className="col gap-3">
                {topExercisesByVolume.map((ex, i) => (
                  <div key={ex.name} className="row gap-3">
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                      background: i === 0 ? "var(--accent)" : "var(--surface-2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 700,
                      color: i === 0 ? "#000" : "var(--text-dim)",
                    }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{ex.name}</div>
                      <div className="bar-track" style={{ marginTop: 4 }}>
                        <div className="bar-fill" style={{ width: `${(ex.vol / maxExVol) * 100}%` }} />
                      </div>
                    </div>
                    <div className="h-mono" style={{ fontSize: 12, color: "var(--text-mute)" }}>
                      {ex.currentWeight}kg
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
