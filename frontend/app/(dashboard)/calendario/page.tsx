"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Dumbbell, Check } from "lucide-react";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useSessions } from "@/hooks/useSessions";

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// Paleta de cores para os códigos dos treinos (A, B, C…)
const CODE_COLORS: Record<string, string> = {
  A: "var(--accent)",
  B: "#7DD3FC",
  C: "#FBBF24",
  D: "#F472B6",
  E: "#A78BFA",
  F: "#FB923C",
};

function codeColor(code: string): string {
  return CODE_COLORS[code?.toUpperCase()?.[0]] ?? "var(--accent)";
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de calendário
// ─────────────────────────────────────────────────────────────────────────────

// Retorna o nome do mês e ano formatado (ex: "Maio 2026")
function formatMonth(date: Date): string {
  return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^\w/, c => c.toUpperCase());
}

// Quantos dias tem o mês
function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Dia da semana do 1.º dia do mês (0=Dom … 6=Sáb)
function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────────

export default function CalendarioPage() {
  const { workouts, loading } = useWorkouts();
  const { sessions } = useSessions(365);

  // Navegação de mês
  const [mesOffset, setMesOffset] = useState(0);
  // year/month calculados em useMemo como primitivos estáveis — um objeto
  // Date (mesmo recriado a cada render) não é uma dependência segura para
  // o React Compiler preservar a memoização abaixo.
  const { year, month } = useMemo(() => {
    const today = new Date();
    const d = new Date(today.getFullYear(), today.getMonth() + mesOffset, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  }, [mesOffset]);
  const baseDate = new Date(year, month, 1);

  // ── Dias com sessão real executada no mês atual ───────────────────────────
  const doneDays = useMemo(() => {
    const set = new Set<number>();
    for (const s of sessions) {
      const d = new Date(s.executedAt);
      if (d.getFullYear() === year && d.getMonth() === month) {
        set.add(d.getDate());
      }
    }
    return set;
  }, [sessions, year, month]);

  // ── Construir mapa de dias treinados ──────────────────────────────────────
  // Usa o campo `schedule` de cada treino para marcar os dias da semana
  // que têm treino programado e os mapeia para o mês actual.
  const trainedDays = useMemo(() => {
    const map: Record<number, { code: string; name: string; id: number }> = {};
    const total = daysInMonth(year, month);

    for (let day = 1; day <= total; day++) {
      const weekday = new Date(year, month, day).getDay(); // 0=Dom…6=Sáb
      const weekName = DAY_NAMES[weekday]; // ex: "Seg"

      // Verifica se algum treino está programado para este dia da semana
      for (const w of workouts) {
        if (!w.schedule) continue;
        // schedule pode ser "Seg, Qui" ou "Seg · Qui" — normaliza
        const days = w.schedule.split(/[,·\s]+/).map(d => d.trim());
        const matches = days.some(d =>
          weekName.toLowerCase().startsWith(d.toLowerCase().slice(0, 3))
        );
        if (matches) {
          map[day] = { code: w.code, name: w.name, id: w.id };
          break; // um dia pode ter só um treino no calendário
        }
      }
    }
    return map;
  }, [workouts, year, month]);

  // ── Stats derivadas ────────────────────────────────────────────────────────
  const trainedCount = Object.keys(trainedDays).length;
  const workingDays  = daysInMonth(year, month);

  // Volume total de todos os treinos (dado real do backend)
  const totalVolume = workouts.reduce((s, w) => s + (w.volume ?? 0), 0);

  // Atividade recente: últimos 4 treinos cadastrados
  const recentWorkouts = [...workouts].slice(0, 4);

  // Células do calendário: espaços vazios antes do 1.º dia + dias do mês
  const offset = firstDayOfMonth(year, month);
  const cells  = daysInMonth(year, month);

  // ── Legenda: códigos únicos presentes no mês ──────────────────────────────
  const legendCodes = [...new Set(Object.values(trainedDays).map(v => v.code))];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="anim-up">
      <div className="page-head">
        <div>
          <h1 className="page-title">Histórico</h1>
          <div className="page-sub">Treinos programados no mês</div>
        </div>
        {/* Navegação de mês */}
        <div className="row gap-2">
          <button className="icon-btn" onClick={() => setMesOffset(o => o - 1)}><ChevronLeft size={16} /></button>
          <div className="btn btn-secondary btn-sm" style={{ pointerEvents: "none", textTransform: "capitalize" }}>
            {formatMonth(baseDate)}
          </div>
          <button className="icon-btn" onClick={() => setMesOffset(o => o + 1)}><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Stats do mês */}
      <div className="grid-cols-4" style={{ gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div className="h-eyebrow">Dias com treino</div>
          <div className="h-display" style={{ fontSize: 30, marginTop: 8 }}>
            {doneDays.size > 0 ? doneDays.size : trainedCount}
            <span className="stat-unit">/{workingDays} dias</span>
          </div>
          {doneDays.size > 0 && (
            <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4, fontWeight: 600 }}>
              {doneDays.size} sessão{doneDays.size !== 1 ? "s" : ""} concluída{doneDays.size !== 1 ? "s" : ""}
            </div>
          )}
        </div>
        <div className="card">
          <div className="h-eyebrow">Treinos</div>
          <div className="h-display" style={{ fontSize: 30, marginTop: 8, color: "var(--accent)" }}>
            {workouts.length}
            <span className="stat-unit"> planos</span>
          </div>
        </div>
        <div className="card">
          <div className="h-eyebrow">Volume total</div>
          <div className="h-display" style={{ fontSize: 30, marginTop: 8 }}>
            {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume.toFixed(0)}
            <span className="stat-unit"> kg</span>
          </div>
        </div>
        <div className="card">
          <div className="h-eyebrow">Frequência</div>
          <div className="h-display" style={{ fontSize: 30, marginTop: 8 }}>
            {workingDays > 0 ? Math.round((trainedCount / workingDays) * 100) : 0}
            <span className="stat-unit">%</span>
          </div>
        </div>
      </div>

      <div className="grid-3">

        {/* ── Calendário ── */}
        <div className="card">
          <div className="h-eyebrow" style={{ marginBottom: 16 }}>{formatMonth(baseDate)}</div>

          {/* Cabeçalho dos dias da semana */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
            {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
              <div key={d} style={{
                fontSize: 9, color: "var(--text-mute)", textAlign: "center",
                fontWeight: 700, letterSpacing: "0.06em",
              }}>{d}</div>
            ))}
          </div>

          {/* Grade de dias */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>

            {/* Células vazias antes do 1.º dia */}
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Dias do mês */}
            {Array.from({ length: cells }).map((_, i) => {
              const day = i + 1;
              const trained = trainedDays[day];
              const done = doneDays.has(day);
              const today = new Date();
              const isToday = day === today.getDate() &&
                              month === today.getMonth() &&
                              year  === today.getFullYear();

              return (
                <div key={day} style={{
                  aspectRatio: "1", borderRadius: 8,
                  background: done ? "rgba(0,255,136,0.08)" : trained ? "var(--surface-2)" : "transparent",
                  border: done
                    ? "1.5px solid var(--accent)"
                    : isToday
                      ? "1.5px solid var(--accent)"
                      : trained
                        ? "1px solid var(--border)"
                        : "1px dashed var(--border-soft)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  position: "relative", cursor: trained ? "pointer" : "default",
                  transition: "all 0.12s",
                }}>
                  <span style={{
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    color: done ? "var(--accent)" : isToday ? "var(--accent)" : trained ? "var(--text-dim)" : "var(--text-mute)",
                    fontWeight: done || isToday ? 700 : 400,
                  }}>
                    {day}
                  </span>
                  {/* Checkmark para dias realmente treinados */}
                  {done && (
                    <div style={{
                      position: "absolute", top: 2, right: 2,
                      width: 12, height: 12, borderRadius: "50%",
                      background: "var(--accent)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <Check size={7} color="#000" strokeWidth={3} />
                    </div>
                  )}
                  {/* Código do treino programado */}
                  {trained && !done && (
                    <span style={{
                      position: "absolute", bottom: 3,
                      fontSize: 7, fontWeight: 700,
                      color: codeColor(trained.code),
                    }}>
                      {trained.code}
                    </span>
                  )}
                  {done && trained && (
                    <span style={{
                      position: "absolute", bottom: 3,
                      fontSize: 7, fontWeight: 700,
                      color: codeColor(trained.code),
                    }}>
                      {trained.code}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legenda dos treinos */}
          {legendCodes.length > 0 && (
            <div style={{
              marginTop: 16, padding: "10px 12px",
              background: "var(--surface-2)", borderRadius: 10,
              display: "flex", gap: 12, flexWrap: "wrap",
            }}>
              {legendCodes.map(code => {
                const w = workouts.find(wk => wk.code === code);
                return (
                  <div key={code} className="row gap-2" style={{ fontSize: 11 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: 2,
                      background: codeColor(code), display: "inline-block", flexShrink: 0,
                    }} />
                    <span style={{ color: "var(--text-dim)" }}>
                      {code} — {w?.name ?? code}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Atividade recente ── */}
        <div className="card">
          <div className="h-eyebrow" style={{ marginBottom: 14 }}>Seus treinos</div>

          {loading && (
            <p style={{ fontSize: 13, color: "var(--text-mute)" }}>Carregando...</p>
          )}

          {!loading && workouts.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <Dumbbell size={32} style={{ opacity: 0.3, marginBottom: 10 }} />
              <p style={{ fontSize: 13, color: "var(--text-mute)" }}>
                Nenhum treino cadastrado ainda.
              </p>
              <Link href="/treinos" className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>
                Criar treino
              </Link>
            </div>
          )}

          <div className="col gap-3">
            {recentWorkouts.map((w, i) => (
              <Link key={w.id} href={`/treinos/${w.id}`} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 0", textDecoration: "none",
                borderBottom: i < recentWorkouts.length - 1 ? "1px solid var(--border-soft)" : "none",
              }}>
                {/* Código colorido */}
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: "var(--surface-2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13,
                  color: codeColor(w.code), flexShrink: 0,
                }}>
                  {w.code}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                    {w.name}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>
                    {w.schedule || "Sem dia definido"} · {w.exercises.length} exercícios
                  </div>
                </div>

                {/* Volume do treino */}
                <div className="h-mono" style={{ fontSize: 12, color: "var(--accent)", flexShrink: 0 }}>
                  {w.volume >= 1000
                    ? `${(w.volume / 1000).toFixed(1)}k`
                    : w.volume.toFixed(0)} kg
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
