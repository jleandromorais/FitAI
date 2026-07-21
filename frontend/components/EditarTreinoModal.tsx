"use client";

import { useState, useEffect } from "react";
import { X, Trash2 } from "lucide-react";
import { ALL_GROUPS } from "@/lib/exercises";
import { useWorkouts, Workout } from "@/hooks/useWorkouts";
import { ExerciseRow, DAYS_OPTIONS, TAGS_OPTIONS, uid, labelStyle, chipToggleStyle } from "@/lib/workout-shared";
import { useExerciseRows } from "@/hooks/useExerciseRows";
import ExerciseCatalog from "@/components/ui/ExerciseCatalog";
import SetsTable from "@/components/ui/SetsTable";

interface Props {
  workout: Workout;
  onClose: () => void;
  onSaved: () => void;
}

function toExerciseRows(workout: Workout): ExerciseRow[] {
  return workout.exercises.map(ex => ({
    id: uid(),
    name: ex.name,
    muscle: ex.muscle ?? "",
    group: ex.muscle?.split(" ")?.[0] ?? "",
    tips: "",
    sets: ex.sets.map(s => ({ reps: s.reps, weight: s.weight, rest: ex.restSeconds ?? 60 })),
  }));
}

export default function EditarTreinoModal({ workout, onClose, onSaved }: Props) {
  const { updateWorkout } = useWorkouts();

  const [name, setName]               = useState(workout.name);
  const [selectedDays, setSelectedDays] = useState<string[]>(
    workout.schedule ? workout.schedule.split(/[,·\s]+/).map(d => d.trim()).filter(Boolean) : []
  );
  const [selectedTags, setSelectedTags] = useState<string[]>(workout.tags ?? []);
  const { exercises, addExercise, addCustomExercise, removeExercise, addSet, removeSet, updateSet } =
    useExerciseRows(toExerciseRows(workout));
  const [tab, setTab]                   = useState<"info" | "exercicios">("info");
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState<string | null>(null);

  // Fecha com Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Submissão ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!name.trim()) return setError("Dê um nome ao treino.");
    if (exercises.length === 0) return setError("Adicione pelo menos 1 exercício.");
    setError(null);
    setSaving(true);
    try {
      await updateWorkout(workout.id, {
        name: name.trim(),
        code: workout.code,
        schedule: selectedDays.join(", "),
        tags: selectedTags,
        exercises: exercises.map(ex => ({
          name: ex.name, muscle: ex.muscle,
          restSeconds: ex.sets[0]?.rest ?? 60,
          sets: ex.sets.map(s => ({ reps: s.reps, weight: s.weight, done: false, prev: 0 })),
        })),
      });
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 1000 }} />

      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: tab === "exercicios" ? "min(900px, 96vw)" : "min(520px, 96vw)", maxHeight: "90vh",
        background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 18,
        boxShadow: "0 32px 80px rgba(0,0,0,0.5)", zIndex: 1001, display: "flex",
        flexDirection: "column", overflow: "hidden", transition: "width 0.3s ease",
      }}>

        {/* Cabeçalho */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border-soft)", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>Editar treino</div>
            <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>{workout.name}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-mute)" }}><X size={20} /></button>
        </div>

        {/* Abas */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border-soft)", padding: "0 24px", flexShrink: 0 }}>
          {(["info", "exercicios"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "12px 16px", fontSize: 13, fontWeight: 600, background: "none", border: "none", cursor: "pointer",
              color: tab === t ? "var(--accent)" : "var(--text-mute)",
              borderBottom: `2px solid ${tab === t ? "var(--accent)" : "transparent"}`,
              marginBottom: -1, transition: "all 0.15s",
            }}>
              {t === "info" ? "Informações" : `Exercícios (${exercises.length})`}
            </button>
          ))}
        </div>

        {/* Corpo */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>

          {/* Aba: Informações */}
          {tab === "info" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={labelStyle}>Nome do treino</label>
                <input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Dias da semana</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {DAYS_OPTIONS.map(d => (
                    <button key={d} onClick={() => setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])} style={chipToggleStyle(selectedDays.includes(d))}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Tipo de estímulo</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {TAGS_OPTIONS.map(t => (
                    <button key={t} onClick={() => setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])} style={chipToggleStyle(selectedTags.includes(t))}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Aba: Exercícios */}
          {tab === "exercicios" && (
            <div style={{ display: "flex", gap: 20, minHeight: 420 }}>
              {/* Painel esquerdo: filtro por grupo */}
              <div style={{ width: 160, flexShrink: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                {ALL_GROUPS.map(g => (
                  <div key={g} style={{ padding: "8px 12px", borderRadius: 8, fontSize: 13, color: "var(--text-dim)" }}>
                    {g}
                    <span style={{ float: "right", fontSize: 10, opacity: 0.6 }}>
                      {exercises.filter(e => e.group === g).length}
                    </span>
                  </div>
                ))}
              </div>

              {/* Painel direito: catálogo */}
              <div style={{ flex: 1, overflowY: "auto", maxHeight: 500 }}>
                <ExerciseCatalog
                  exercises={exercises}
                  availableGroups={ALL_GROUPS}
                  onAdd={addExercise}
                  onAddCustom={addCustomExercise}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {exercises.map((ex, exIdx) => (
                      <div key={ex.id} style={{ padding: 14, borderRadius: 12, background: "var(--surface-2)", border: "1.5px solid var(--border-soft)", position: "relative" }}>
                        <button onClick={() => removeExercise(ex.id)} style={{ position: "absolute", top: 10, right: 10, background: "none", border: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }}>
                          <Trash2 size={14} />
                        </button>
                        <SetsTable exercise={ex} exerciseIndex={exIdx} onUpdateSet={updateSet} onAddSet={addSet} onRemoveSet={removeSet} />
                      </div>
                    ))}
                  </div>
                </ExerciseCatalog>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: "1px solid var(--border-soft)", flexShrink: 0, gap: 12 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          {error && <p style={{ fontSize: 12, color: "var(--danger)", flex: 1, textAlign: "center" }}>{error}</p>}
          <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar alterações ✓"}
          </button>
        </div>
      </div>
    </>
  );
}
