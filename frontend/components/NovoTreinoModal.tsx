"use client";

import { useEffect, useState } from "react";
import { X, Plus, Trash2, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useWorkoutSlots } from "@/hooks/useWorkoutSlots";
import {
  DAYS_OPTIONS, TAGS_OPTIONS, ALL_GROUPS,
  codeFromLabel, SPLITS,
  labelStyle, chipToggleStyle,
} from "@/lib/workout-shared";
import ExerciseCatalog from "@/components/ui/ExerciseCatalog";
import SetsTable from "@/components/ui/SetsTable";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const STEP_LABELS = ["Split", "Dias", "Exercícios", "Revisão"];

function StepDots({ step }: { step: number }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 28 }}>
      {STEP_LABELS.map((label, i) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%",
            background: i <= step ? "var(--accent)" : "var(--surface-2)",
            border: `2px solid ${i === step ? "var(--accent)" : "var(--border)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700,
            color: i <= step ? "#000" : "var(--text-mute)", transition: "all 0.2s",
          }}>
            {i < step ? <Check size={11} /> : i + 1}
          </div>
          <span style={{ fontSize: 11, color: i === step ? "var(--text)" : "var(--text-mute)" }}>{label}</span>
          {i < STEP_LABELS.length - 1 && <div style={{ width: 16, height: 1, background: "var(--border)" }} />}
        </div>
      ))}
    </div>
  );
}

export default function NovoTreinoModal({ onClose, onCreated }: Props) {
  const { createWorkout } = useWorkouts();

  const {
    step, setStep,
    selectedSplit, selectSplit,
    slots, activeSlotIdx, setActiveSlotIdx,
    addCustomSlot, updateSlotLabel, toggleSlotGroup, toggleSlotDay, toggleSlotTag, removeSlot, duplicateSlot,
    addExercise, addCustomExercise, removeExercise, addSet, removeSet, updateSet,
  } = useWorkoutSlots();

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Fecha com Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Submissão ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    const emptySlot = slots.find(s => s.exercises.length === 0);
    if (emptySlot) return setError(`Adicione exercícios ao "${emptySlot.label}".`);
    setError(null);
    setSaving(true);
    try {
      await Promise.all(slots.map(slot =>
        createWorkout({
          name: slot.label,
          code: codeFromLabel(slot.label),
          schedule: slot.days.join(", "),
          tags: slot.tags,
          exercises: slot.exercises.map(ex => ({
            name: ex.name, muscle: ex.muscle,
            restSeconds: ex.sets[0]?.rest ?? 60,
            sets: ex.sets.map(s => ({ reps: s.reps, weight: s.weight, done: false, prev: 0 })),
          })),
        })
      ));
      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao salvar treinos.");
    } finally {
      setSaving(false);
    }
  }

  // ── Passo 0: Escolha do split ─────────────────────────────────────────────────

  function renderStep0() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 4 }}>
          Escolha como quer dividir os seus treinos na semana. Cada bloco vira um treino separado.
        </p>
        {SPLITS.map(split => (
          <button key={split.id} onClick={() => selectSplit(split)} style={{
            display: "flex", alignItems: "flex-start", gap: 16,
            padding: "16px 18px", borderRadius: 12, textAlign: "left",
            background: "var(--surface-2)", border: "1.5px solid var(--border-soft)",
            cursor: "pointer", transition: "all 0.15s",
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border-soft)")}
          >
            <span style={{ fontSize: 28, flexShrink: 0 }}>{split.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 4 }}>{split.label}</div>
              <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 10 }}>{split.description}</div>
              {split.slots.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {split.slots.map(s => <span key={s.label} className="chip">{s.label.split("—")[0].trim()}</span>)}
                </div>
              )}
            </div>
            <ChevronRight size={18} color="var(--text-mute)" style={{ flexShrink: 0, marginTop: 2 }} />
          </button>
        ))}
      </div>
    );
  }

  // ── Passo 1: Configurar dias e tags ──────────────────────────────────────────

  function renderStep1() {
    const isCustom = selectedSplit?.id === "custom";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <p style={{ fontSize: 13, color: "var(--text-dim)" }}>
          Associe cada bloco do treino aos dias da semana e ao tipo de estímulo.
        </p>
        {slots.map((slot, idx) => (
          <div key={slot.id} style={{ padding: 20, borderRadius: 14, background: "var(--surface-2)", border: "1.5px solid var(--border-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: "var(--accent-soft)",
                border: "1.5px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent)", fontSize: 13,
              }}>
                {String.fromCharCode(65 + idx)}
              </div>
              {isCustom
                ? <input className="input" value={slot.label} onChange={e => updateSlotLabel(slot.id, e.target.value)} style={{ flex: 1, fontWeight: 700 }} placeholder="Nome do treino" />
                : <div style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>{slot.label}</div>
              }
              <button onClick={() => duplicateSlot(slot.id)} title="Duplicar bloco" style={{
                background: "none", border: "1.5px solid var(--border)", borderRadius: 7,
                cursor: "pointer", color: "var(--text-dim)", padding: "4px 10px", fontSize: 11, fontWeight: 600,
                display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-dim)"; }}
              >
                <Plus size={12} /> Duplicar
              </button>
              {slots.length > 1 && (
                <button onClick={() => removeSlot(slot.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)" }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {isCustom && (
              <div style={{ marginBottom: 14 }}>
                <div style={labelStyle}>Grupos musculares</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {ALL_GROUPS.map(g => <button key={g} onClick={() => toggleSlotGroup(slot.id, g)} style={chipToggleStyle(slot.groups.includes(g))}>{g}</button>)}
                </div>
              </div>
            )}

            {!isCustom && (
              <div style={{ marginBottom: 14 }}>
                <div style={labelStyle}>Músculos trabalhados</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {slot.groups.map(g => <span key={g} className="chip chip-accent">{g}</span>)}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <div style={labelStyle}>Dias da semana</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {DAYS_OPTIONS.map(d => <button key={d} onClick={() => toggleSlotDay(slot.id, d)} style={chipToggleStyle(slot.days.includes(d))}>{d}</button>)}
              </div>
            </div>

            <div>
              <div style={labelStyle}>Tipo de estímulo</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {TAGS_OPTIONS.map(t => <button key={t} onClick={() => toggleSlotTag(slot.id, t)} style={chipToggleStyle(slot.tags.includes(t))}>{t}</button>)}
              </div>
            </div>
          </div>
        ))}

        {isCustom && (
          <button className="btn btn-secondary" onClick={addCustomSlot}>
            <Plus size={14} /> Adicionar bloco de treino
          </button>
        )}
      </div>
    );
  }

  // ── Passo 2: Exercícios ───────────────────────────────────────────────────────

  function renderStep2() {
    const slot = slots[activeSlotIdx];
    if (!slot) return null;
    const groupsForSlot = slot.groups.length > 0 ? slot.groups : ALL_GROUPS;

    return (
      <div style={{ display: "flex", gap: 0, minHeight: 440 }}>
        {/* Abas dos slots */}
        <div style={{ width: 180, flexShrink: 0, borderRight: "1px solid var(--border-soft)", paddingRight: 16, marginRight: 20, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={labelStyle}>Blocos do treino</div>
          {slots.map((s, i) => (
            <button key={s.id} onClick={() => setActiveSlotIdx(i)} style={{
              textAlign: "left", padding: "10px 12px", borderRadius: 9,
              background: i === activeSlotIdx ? "var(--accent-soft)" : "transparent",
              border: `1.5px solid ${i === activeSlotIdx ? "var(--accent)" : "transparent"}`,
              color: i === activeSlotIdx ? "var(--accent)" : "var(--text-dim)",
              fontWeight: i === activeSlotIdx ? 700 : 500, fontSize: 13, cursor: "pointer", transition: "all 0.12s",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{String.fromCharCode(65 + i)} · {s.label.split("—")[0].trim()}</span>
                {s.exercises.length > 0 && (
                  <span style={{ fontSize: 10, fontWeight: 700, background: i === activeSlotIdx ? "var(--accent)" : "var(--surface-2)", color: i === activeSlotIdx ? "#000" : "var(--text-mute)", borderRadius: 99, padding: "1px 6px" }}>
                    {s.exercises.length}
                  </span>
                )}
              </div>
              {s.groups.length > 0 && <div style={{ fontSize: 10, color: "var(--text-mute)", marginTop: 3 }}>{s.groups.slice(0, 3).join(" · ")}</div>}
            </button>
          ))}
        </div>

        {/* Catálogo + exercícios adicionados */}
        <div style={{ flex: 1, overflowY: "auto", maxHeight: 500 }}>
          <div style={{ marginBottom: 12 }}>
            <div className="h-eyebrow">{slot.label}</div>
            <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>{slot.groups.join(" · ")}</div>
          </div>
          <ExerciseCatalog
            exercises={slot.exercises}
            availableGroups={groupsForSlot}
            onAdd={addExercise}
            onAddCustom={addCustomExercise}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {slot.exercises.map((ex, exIdx) => (
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
    );
  }

  // ── Passo 3: Revisão ─────────────────────────────────────────────────────────

  function renderStep3() {
    const totalExercises = slots.reduce((s, sl) => s + sl.exercises.length, 0);
    const totalSets      = slots.reduce((s, sl) => s + sl.exercises.reduce((ss, ex) => ss + ex.sets.length, 0), 0);
    const totalVol       = slots.reduce((s, sl) => s + sl.exercises.reduce((ss, ex) => ss + ex.sets.reduce((sss, set) => sss + set.weight * set.reps, 0), 0), 0);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ padding: 20, borderRadius: 14, background: "var(--accent-soft)", border: "1.5px solid var(--accent)" }}>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{selectedSplit?.label}</div>
          <div style={{ display: "flex", gap: 24, marginTop: 10 }}>
            {[[slots.length, "blocos"], [totalExercises, "exercícios"], [totalSets, "séries"], [totalVol > 0 ? `${(totalVol / 1000).toFixed(1)}k` : "–", "kg vol"]].map(([v, l]) => (
              <div key={String(l)}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>{v}</div>
                <div style={{ fontSize: 11, color: "var(--text-mute)" }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {slots.map((slot, i) => {
          const slotSets = slot.exercises.reduce((s, ex) => s + ex.sets.length, 0);
          const slotVol  = slot.exercises.reduce((s, ex) => s + ex.sets.reduce((ss, set) => ss + set.weight * set.reps, 0), 0);
          return (
            <div key={slot.id} style={{ padding: 18, borderRadius: 14, background: "var(--surface-2)", border: "1.5px solid var(--border-soft)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--surface)", border: "1.5px solid var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent)" }}>
                  {String.fromCharCode(65 + i)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{slot.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>
                    {slot.days.length > 0 ? slot.days.join(" · ") : "Sem dia definido"} · {slot.exercises.length} exerc. · {slotSets} séries{slotVol > 0 ? ` · ${(slotVol / 1000).toFixed(1)}k kg` : ""}
                  </div>
                </div>
                {slot.tags.map(t => <span key={t} className="chip chip-accent">{t}</span>)}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {slot.exercises.map((ex, ei) => (
                  <div key={ex.id} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--accent)", fontWeight: 700, marginTop: 2, width: 20 }}>{String(ei + 1).padStart(2, "0")}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{ex.name}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                        {ex.sets.map((s, si) => (
                          <span key={si} style={{ padding: "3px 8px", borderRadius: 6, background: "var(--surface)", fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-dim)", border: "1px solid var(--border-soft)" }}>
                            {s.weight > 0 ? `${s.weight}kg` : "PC"} × {s.reps}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {error && <p style={{ fontSize: 13, color: "var(--danger)", textAlign: "center" }}>{error}</p>}
      </div>
    );
  }

  // ── Render principal ──────────────────────────────────────────────────────────

  const totalEx     = slots.reduce((s, sl) => s + sl.exercises.length, 0);
  const stepTitles  = ["Escolha o tipo de divisão", "Configure os dias e estímulos", "Adicione os exercícios", "Confirme o seu plano"];
  const stepSubs    = ["Cada bloco vira um treino separado.", "Defina quando e como treinar cada bloco.", `${totalEx} exercício${totalEx !== 1 ? "s" : ""} adicionado${totalEx !== 1 ? "s" : ""}`, `${slots.length} bloco${slots.length !== 1 ? "s" : ""} prontos para salvar.`];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 1000 }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        width: step === 2 ? "min(960px, 96vw)" : "min(560px, 96vw)", maxHeight: "90vh",
        background: "var(--bg)", border: "1.5px solid var(--border)", borderRadius: 18,
        boxShadow: "0 32px 80px rgba(0,0,0,0.5)", zIndex: 1001, display: "flex",
        flexDirection: "column", overflow: "hidden", transition: "width 0.3s ease",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border-soft)", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18 }}>{stepTitles[step]}</div>
            <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>{stepSubs[step]}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-mute)", padding: 4 }}><X size={20} /></button>
        </div>

        <div style={{ padding: "24px 24px 0", overflowY: "auto", flex: 1 }}>
          {step > 0 && <StepDots step={step} />}
          {step === 0 && renderStep0()}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </div>

        {step > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px", borderTop: "1px solid var(--border-soft)", flexShrink: 0, gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => setStep(s => s === 1 ? 0 : s - 1)}>
              <ChevronLeft size={16} /> Voltar
            </button>
            {step < 3
              ? <button className="btn btn-primary" disabled={step === 2 && slots.some(s => s.exercises.length === 0)} onClick={() => setStep(s => s + 1)}>
                  {step === 2 ? "Revisar plano" : "Próximo"} <ChevronRight size={16} />
                </button>
              : <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
                  {saving ? "Salvando..." : `Criar ${slots.length} treino${slots.length !== 1 ? "s" : ""} ✓`}
                </button>
            }
          </div>
        )}
      </div>
    </>
  );
}
