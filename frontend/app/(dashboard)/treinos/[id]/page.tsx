"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Edit2, Trash2, Play, Timer, Dumbbell, Target, Weight,
  RefreshCw, Check, Loader2, X, Trophy, Flame,
} from "lucide-react";
import { useWorkout, useWorkouts } from "@/hooks/useWorkouts";
import { useWorkoutSession } from "@/hooks/useWorkoutSession";
import EditarTreinoModal from "@/components/EditarTreinoModal";

// Formata segundos como "mm:ss" para o cronómetro da sessão
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TreinoDetalhe() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { workout, loading, error } = useWorkout(id);
  const { deleteWorkout } = useWorkouts();

  const {
    executing, liveExercises, focusedEx, notes, setNotes, finishing, sessionResult,
    sessionSeconds, restTimer, startSession, stopSession, toggleSet, updateLiveSet,
    handleFinish, startRestTimer, skipRestTimer, addRestSeconds,
    doneSetsCount, totalSetsCount, progress, liveVolume,
  } = useWorkoutSession(workout);

  // Modais auxiliares
  const [showEditar, setShowEditar] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Dispara a animação de "sucesso" só no instante em que uma série passa de
  // não-feita pra feita (nunca ao desmarcar) — limpa sozinha no fim da
  // animação via onAnimationEnd, então nunca volta a tocar em re-renders
  // seguintes com o mesmo s.done === true.
  const [poppingKey, setPoppingKey] = useState<string | null>(null);

  // ── Estilos da tabela ────────────────────────────────────────────────────────
  const th: React.CSSProperties = {
    padding: "10px 16px", textAlign: "left", fontSize: 10, fontWeight: 700,
    letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-mute)",
  };
  const td: React.CSSProperties = { padding: "10px 16px" };

  // ── Loading / erro ───────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
      <Loader2 size={36} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error || !workout) return (
    <div className="card" style={{ textAlign: "center", padding: 60 }}>
      <p style={{ color: "var(--danger)" }}>{error ?? "Treino não encontrado."}</p>
      <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => router.back()}>Voltar</button>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Tela de resultado após finalizar
  // ─────────────────────────────────────────────────────────────────────────────
  if (sessionResult) {
    const vol = sessionResult.totalVolume;
    return (
      <div className="anim-up" style={{ maxWidth: 560, margin: "0 auto", paddingTop: 40 }}>
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          {/* Ícone de conclusão */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "var(--accent)", margin: "0 auto 24px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Trophy size={36} color="#000" />
          </div>

          <h1 className="h-display" style={{ fontSize: 28, marginBottom: 8 }}>Treino concluído!</h1>
          <p style={{ color: "var(--text-dim)", marginBottom: sessionResult.saved ? 32 : 12, fontSize: 14 }}>
            {workout.name} — ótimo trabalho, {formatTime(sessionSeconds)} de esforço.
          </p>

          {!sessionResult.saved && (
            <div style={{
              padding: "10px 16px", borderRadius: 10, marginBottom: 20,
              background: "var(--surface-2)", border: "1px solid var(--danger)",
              color: "var(--danger)", fontSize: 13,
            }}>
              Não foi possível salvar esta sessão no servidor. Os números abaixo são uma estimativa local — verifique sua conexão.
            </div>
          )}

          {/* Resumo em 3 stats */}
          <div className="grid-cols-3" style={{ gap: 16, marginBottom: 32 }}>
            {[
              [sessionResult.durationMinutes, "min"],
              [sessionResult.setsCompleted, "séries feitas"],
              [vol >= 1000 ? `${(vol / 1000).toFixed(1)}k` : vol.toFixed(0), "kg volume"],
            ].map(([v, l]) => (
              <div key={String(l)} className="card" style={{ padding: 16 }}>
                <div className="h-display" style={{ fontSize: 26, color: "var(--accent)" }}>{v}</div>
                <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 4 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Séries não concluídas */}
          {doneSetsCount < totalSetsCount && (
            <div style={{
              padding: "10px 16px", borderRadius: 10, marginBottom: 24,
              background: "var(--surface-2)", border: "1px solid var(--border-soft)",
              fontSize: 13, color: "var(--text-dim)",
            }}>
              <Flame size={14} style={{ marginRight: 6, color: "var(--accent)" }} />
              {totalSetsCount - doneSetsCount} série{totalSetsCount - doneSetsCount !== 1 ? "s" : ""} não concluída{totalSetsCount - doneSetsCount !== 1 ? "s" : ""} — sem problema, evolua no próximo!
            </div>
          )}

          <div className="row gap-3" style={{ justifyContent: "center" }}>
            <button className="btn btn-secondary" onClick={() => router.push("/treinos")}>
              Ver treinos
            </button>
            <button className="btn btn-primary btn-lg" onClick={() => router.push("/progresso")}>
              Ver evolução →
            </button>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Vista de planeamento (antes de iniciar)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!executing) {
    const totalSets = workout.exercises.reduce((s, e) => s + e.sets.length, 0);

    return (
      <div className="anim-up">
        <div className="row gap-3" style={{ marginBottom: 16 }}>
          <button className="icon-btn" onClick={() => router.back()}><ArrowLeft size={18} /></button>
          <div className="h-eyebrow">Voltar · Treinos</div>
        </div>

        {/* Cabeçalho */}
        <div className="page-head">
          <div>
            <h1 className="page-title">{workout.name}</h1>
            <div className="row gap-4" style={{ color: "var(--text-dim)", fontSize: 14, marginTop: 12 }}>
              <div className="row gap-2"><Timer size={16} /> {workout.duration} min est.</div>
              <div className="row gap-2"><Dumbbell size={16} /> {workout.exercises.length} exercícios</div>
              <div className="row gap-2"><Target size={16} /> {totalSets} séries</div>
              <div className="row gap-2"><Weight size={16} /> {(workout.volume / 1000).toFixed(1)}k kg vol</div>
            </div>
          </div>
          <div className="page-actions">
            <button className="btn btn-ghost" style={{ color: "var(--danger)" }} onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> Excluir
            </button>
            <button className="btn btn-secondary" onClick={() => setShowEditar(true)}>
              <Edit2 size={14} /> Editar
            </button>
            {/* Botão principal: inicia o modo de execução */}
            <button className="btn btn-primary btn-lg" onClick={startSession}>
              <Play size={14} fill="currentColor" /> Iniciar treino
            </button>
          </div>
        </div>

        {/* Preview dos exercícios (só leitura) */}
        <div className="grid-3">
          <div className="col-stack">
            {workout.exercises.map((ex, exIdx) => (
              <div key={ex.id ?? exIdx} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div className="row gap-3" style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-soft)" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 9, background: "var(--surface-2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, color: "var(--accent)",
                  }}>
                    {String(exIdx + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <div className="h-display" style={{ fontSize: 16 }}>{ex.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>
                      {ex.muscle} · {ex.sets.length} séries · descanso {ex.restSeconds}s
                    </div>
                  </div>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--surface-2)" }}>
                      <th style={{ ...th, width: 60 }}>Série</th>
                      <th style={th}>Anterior</th>
                      <th style={th}>Carga</th>
                      <th style={th}>Reps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ex.sets.map((s, i) => (
                      <tr key={i} style={{ borderTop: "1px solid var(--border-soft)" }}>
                        <td style={{ ...td, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>{i + 1}</td>
                        <td style={{ ...td, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>
                          {/* Mostra o resultado da última sessão */}
                          {s.prev ? `${s.prev}kg × ${s.reps}` : "—"}
                        </td>
                        <td style={{ ...td, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                          {s.weight > 0 ? `${s.weight} kg` : "PC"}
                        </td>
                        <td style={{ ...td, fontFamily: "var(--font-mono)", fontWeight: 600 }}>{s.reps}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Painel lateral */}
          <div className="col-stack">
            <div className="card">
              <div className="h-eyebrow" style={{ marginBottom: 12 }}>Músculos trabalhados</div>
              <div className="row gap-2" style={{ flexWrap: "wrap" }}>
                {[...new Set(workout.exercises.map(e => e.muscle).filter(Boolean))].map(m => (
                  <span key={m} className="chip chip-accent">{m}</span>
                ))}
              </div>
            </div>
            {workout.schedule && (
              <div className="card">
                <div className="h-eyebrow" style={{ marginBottom: 8 }}>Dias programados</div>
                <div style={{ fontSize: 14, color: "var(--text)" }}>{workout.schedule}</div>
              </div>
            )}
            {/* CTA para iniciar */}
            <button className="btn btn-primary btn-lg btn-block" onClick={startSession}
              style={{ justifyContent: "center" }}>
              <Play size={16} fill="currentColor" /> Iniciar treino agora
            </button>
          </div>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {showEditar && (
          <EditarTreinoModal workout={workout} onClose={() => setShowEditar(false)} onSaved={() => router.refresh()} />
        )}

        {confirmDelete && (
          <>
            <div onClick={() => setConfirmDelete(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", zIndex: 1000 }} />
            <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "min(400px,90vw)", background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 16, boxShadow: "0 24px 60px rgba(0,0,0,0.4)", padding: 28, zIndex: 1001 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Excluir treino?</div>
              <p style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 24, lineHeight: 1.55 }}>
                <strong style={{ color: "var(--text)" }}>{workout.name}</strong> será removido permanentemente.
              </p>
              <div className="row gap-3" style={{ justifyContent: "flex-end" }}>
                <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Cancelar</button>
                <button className="btn btn-danger" disabled={deleting} onClick={async () => {
                  setDeleting(true);
                  try { await deleteWorkout(workout.id); router.push("/treinos"); }
                  finally { setDeleting(false); }
                }}>
                  {deleting ? "Excluindo..." : "Sim, excluir"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Modo de execução (sessão em curso)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="anim-up">

      {/* Barra de topo fixa durante a execução */}
      <div style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--bg)", borderBottom: "1px solid var(--border-soft)",
        padding: "12px 0", marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div className="row gap-3">
            <button className="icon-btn" onClick={stopSession}>
              <X size={18} />
            </button>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{workout.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-mute)" }}>
                {/* Cronómetro da sessão */}
                {formatTime(sessionSeconds)} · {doneSetsCount}/{totalSetsCount} séries
              </div>
            </div>
          </div>

          {/* Barra de progresso inline */}
          <div style={{ flex: 1, maxWidth: 300 }}>
            <div className="bar-track" style={{ height: 6 }}>
              <div className="bar-fill" style={{ transform: `scaleX(${progress / 100})` }} />
            </div>
          </div>

          {/* Volume ao vivo */}
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--accent)" }}>
              {liveVolume >= 1000 ? `${(liveVolume / 1000).toFixed(1)}k` : liveVolume.toFixed(0)} kg
            </div>
            <div style={{ fontSize: 10, color: "var(--text-mute)" }}>volume</div>
          </div>

          {/* Botão finalizar */}
          <button className="btn btn-primary" onClick={handleFinish} disabled={finishing}>
            {finishing ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Check size={14} />}
            {finishing ? "Salvando..." : "Finalizar"}
          </button>
        </div>
      </div>

      <div className="grid-3">
        {/* Exercícios executáveis */}
        <div className="col-stack">
          {liveExercises.map((ex, exIdx) => {
            const exDone = ex.sets.every(s => s.done);
            const exProgress = ex.sets.filter(s => s.done).length;
            return (
              <div key={ex.id ?? exIdx} className="card" style={{
                padding: 0, overflow: "hidden",
                // Destaque visual no exercício em foco
                border: focusedEx === exIdx ? "1.5px solid var(--accent)" : "1.5px solid var(--border-soft)",
                opacity: exDone ? 0.7 : 1,
                transition: "all 0.2s",
              }}>
                {/* Cabeçalho do exercício */}
                <div className="row between" style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-soft)" }}>
                  <div className="row gap-3">
                    <div style={{
                      width: 36, height: 36, borderRadius: 9,
                      background: exDone ? "var(--accent)" : "var(--surface-2)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
                      color: exDone ? "#000" : "var(--accent)",
                      transition: "all 0.2s",
                    }}>
                      {exDone ? <Check size={16} /> : String(exIdx + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <div className="h-display" style={{ fontSize: 16 }}>{ex.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>
                        {ex.muscle} · {exProgress}/{ex.sets.length} séries · descanso {ex.restSeconds}s
                      </div>
                    </div>
                  </div>
                  <button className="icon-btn" style={{ width: 32, height: 32 }}
                    onClick={() => startRestTimer(ex.restSeconds)} title="Iniciar timer manualmente">
                    <RefreshCw size={14} />
                  </button>
                </div>

                {/* Tabela de séries interativa */}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--surface-2)" }}>
                      <th style={{ ...th, width: 50 }}>Série</th>
                      <th style={th}>Anterior</th>
                      <th style={th}>Carga (kg)</th>
                      <th style={th}>Reps</th>
                      <th style={{ ...th, width: 60, textAlign: "right" }}>✓</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ex.sets.map((s, setIdx) => (
                      <tr key={setIdx} style={{
                        borderTop: "1px solid var(--border-soft)",
                        // Linha esverdeada quando a série está feita
                        background: s.done ? "var(--gain-soft)" : "transparent",
                        transition: "background 0.2s",
                      }}>
                        <td style={{ ...td, color: "var(--text-mute)", fontFamily: "var(--font-mono)" }}>{setIdx + 1}</td>

                        {/* Resultado da sessão anterior */}
                        <td style={{ ...td, color: "var(--text-mute)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                          {s.prev ? `${s.prev}kg × ${ex.sets[setIdx] ? ex.sets[setIdx].reps : "–"}` : "—"}
                        </td>

                        {/* Peso editável durante a execução */}
                        <td style={td}>
                          <input
                            type="number" min={0} step={0.5}
                            value={s.weight}
                            onChange={e => updateLiveSet(exIdx, setIdx, "weight", parseFloat(e.target.value) || 0)}
                            disabled={s.done}
                            style={{
                              width: 60, padding: "4px 6px", borderRadius: 7,
                              background: s.done ? "transparent" : "var(--surface-2)",
                              border: s.done ? "none" : "1px solid var(--border)",
                              color: s.done ? "var(--text-mute)" : "var(--text)",
                              fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
                              outline: "none",
                            }}
                          />
                        </td>

                        {/* Reps editável durante a execução */}
                        <td style={td}>
                          <input
                            type="number" min={1}
                            value={s.reps}
                            onChange={e => updateLiveSet(exIdx, setIdx, "reps", parseInt(e.target.value) || 1)}
                            disabled={s.done}
                            style={{
                              width: 48, padding: "4px 6px", borderRadius: 7,
                              background: s.done ? "transparent" : "var(--surface-2)",
                              border: s.done ? "none" : "1px solid var(--border)",
                              color: s.done ? "var(--text-mute)" : "var(--text)",
                              fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
                              outline: "none",
                            }}
                          />
                        </td>

                        {/* Botão de confirmar série */}
                        <td style={{ ...td, textAlign: "right" }}>
                          <button
                            className={poppingKey === `${exIdx}-${setIdx}` ? "set-confirm-btn just-done" : "set-confirm-btn"}
                            onClick={() => {
                              if (!s.done) setPoppingKey(`${exIdx}-${setIdx}`);
                              toggleSet(exIdx, setIdx);
                            }}
                            onAnimationEnd={() => setPoppingKey(k => k === `${exIdx}-${setIdx}` ? null : k)}
                            style={{
                              width: 34, height: 34, borderRadius: 9, border: "none",
                              background: s.done ? "var(--accent)" : "var(--surface-2)",
                              color: s.done ? "#000" : "var(--text-mute)",
                              display: "inline-flex", alignItems: "center", justifyContent: "center",
                              cursor: "pointer", transition: "background 0.2s, color 0.2s, transform 0.2s",
                              transform: s.done ? "scale(1.05)" : "scale(1)",
                            }}
                          >
                            <Check size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Painel lateral direito */}
        <div className="col-stack">

          {/* Timer de descanso */}
          {restTimer !== null && (
            <div className="card card-accent" style={{ textAlign: "center" }}>
              <div className="h-eyebrow" style={{ color: "var(--accent)", marginBottom: 8 }}>Descanso</div>
              <div className="h-display" style={{ fontSize: 64, fontFamily: "var(--font-mono)", lineHeight: 1 }}>
                {/* Mostra mm:ss apenas se > 60s, senão só segundos */}
                {restTimer >= 60 ? formatTime(restTimer) : `0:${String(restTimer).padStart(2, "0")}`}
              </div>
              <div className="row gap-2" style={{ marginTop: 16, justifyContent: "center" }}>
                <button className="btn btn-secondary btn-sm flex-1" onClick={skipRestTimer}>Pular</button>
                <button className="btn btn-primary btn-sm flex-1" onClick={() => addRestSeconds(30)}>+30s</button>
              </div>
            </div>
          )}

          {/* Progresso da sessão */}
          <div className="card">
            <div className="h-eyebrow" style={{ marginBottom: 12 }}>Sessão</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-mute)" }}>Tempo</div>
                <div className="h-mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>
                  {formatTime(sessionSeconds)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-mute)" }}>Volume</div>
                <div className="h-mono" style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>
                  {liveVolume >= 1000 ? `${(liveVolume / 1000).toFixed(1)}k` : liveVolume.toFixed(0)} kg
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-mute)" }}>Séries</div>
                <div className="h-mono" style={{ fontSize: 20, fontWeight: 700 }}>
                  {doneSetsCount}/{totalSetsCount}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-mute)" }}>Progresso</div>
                <div className="h-mono" style={{ fontSize: 20, fontWeight: 700 }}>
                  {Math.round(progress)}%
                </div>
              </div>
            </div>
            <div className="bar-track" style={{ marginTop: 14, height: 6 }}>
              <div className="bar-fill" style={{ transform: `scaleX(${progress / 100})` }} />
            </div>
          </div>

          {/* Músculos trabalhados */}
          <div className="card">
            <div className="h-eyebrow" style={{ marginBottom: 12 }}>Músculos</div>
            <div className="row gap-2" style={{ flexWrap: "wrap" }}>
              {[...new Set(liveExercises.map(e => e.muscle).filter(Boolean))].map(m => (
                <span key={m} className="chip chip-accent">{m}</span>
              ))}
            </div>
          </div>

          {/* Notas da sessão */}
          <div className="card">
            <div className="h-eyebrow" style={{ marginBottom: 10 }}>Notas</div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Como está o treino? Alguma observação?"
              style={{
                width: "100%", minHeight: 90,
                background: "var(--surface-2)", border: "1px solid var(--border)",
                borderRadius: 10, padding: 12,
                color: "var(--text)", fontFamily: "var(--font-body)", fontSize: 13,
                resize: "vertical", outline: "none",
              }}
            />
          </div>

          {/* Botão finalizar no lateral */}
          <button
            className="btn btn-primary btn-lg btn-block"
            style={{ justifyContent: "center" }}
            onClick={handleFinish}
            disabled={finishing}
          >
            {finishing
              ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Salvando...</>
              : <><Check size={16} /> Finalizar treino</>}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
