"use client";

import { useState } from "react";
import { ExerciseSuggestion } from "@/lib/exercises";
import {
  SetRow, SlotDef, SplitDef,
  uid, makeSet, buildSlotsFromSplit,
} from "@/lib/workout-shared";

/**
 * Gerencia o estado do wizard de criação de treino: passo atual, split
 * selecionado, blocos (slots) e o CRUD de exercícios/séries dentro do
 * slot ativo. Espelha useExerciseRows, mas escopado a slots[activeSlotIdx].
 */
export function useWorkoutSlots() {
  const [step, setStep] = useState(0);
  const [selectedSplit, setSelectedSplit] = useState<SplitDef | null>(null);
  const [slots, setSlots] = useState<SlotDef[]>([]);
  const [activeSlotIdx, setActiveSlotIdx] = useState(0);

  // ── Selecionar split ──────────────────────────────────────────────────────

  function selectSplit(split: SplitDef) {
    setSelectedSplit(split);
    setSlots(split.id === "custom"
      ? [{ id: uid(), label: "Treino A", groups: [], days: [], tags: [], exercises: [] }]
      : buildSlotsFromSplit(split)
    );
    setActiveSlotIdx(0);
    setStep(1);
  }

  // ── Gestão de slots ───────────────────────────────────────────────────────

  function addCustomSlot() {
    const letters = "ABCDEFGHIJ";
    setSlots(prev => [...prev, { id: uid(), label: `Treino ${letters[prev.length] ?? prev.length + 1}`, groups: [], days: [], tags: [], exercises: [] }]);
  }

  function updateSlotLabel(slotId: string, label: string) {
    setSlots(prev => prev.map(s => s.id !== slotId ? s : { ...s, label }));
  }

  function toggleSlotGroup(slotId: string, group: string) {
    setSlots(prev => prev.map(s => s.id !== slotId ? s : {
      ...s, groups: s.groups.includes(group) ? s.groups.filter(g => g !== group) : [...s.groups, group],
    }));
  }

  function toggleSlotDay(slotId: string, day: string) {
    setSlots(prev => prev.map(s => s.id !== slotId ? s : {
      ...s, days: s.days.includes(day) ? s.days.filter(d => d !== day) : [...s.days, day],
    }));
  }

  function toggleSlotTag(slotId: string, tag: string) {
    setSlots(prev => prev.map(s => s.id !== slotId ? s : {
      ...s, tags: s.tags.includes(tag) ? s.tags.filter(t => t !== tag) : [...s.tags, tag],
    }));
  }

  function removeSlot(slotId: string) {
    setSlots(prev => {
      const next = prev.filter(s => s.id !== slotId);
      setActiveSlotIdx(i => Math.max(0, Math.min(i, next.length - 1)));
      return next;
    });
  }

  function duplicateSlot(slotId: string) {
    setSlots(prev => {
      const idx = prev.findIndex(s => s.id === slotId);
      if (idx === -1) return prev;
      const origin = prev[idx];
      const baseName = origin.label.replace(/\s+\d+$/, "");
      const siblings = prev.filter(s => s.label.replace(/\s+\d+$/, "") === baseName);
      const needsRenameOriginal = siblings.length === 1;
      const newSlot: SlotDef = { id: uid(), label: `${baseName} ${siblings.length + 1}`, groups: [...origin.groups], days: [], tags: [...origin.tags], exercises: [] };
      const next = [...prev];
      if (needsRenameOriginal) next[idx] = { ...origin, label: `${baseName} 1` };
      next.splice(idx + 1, 0, newSlot);
      return next;
    });
  }

  // ── Gestão de exercícios (no slot ativo) ─────────────────────────────────

  function addExercise(sug: ExerciseSuggestion) {
    const defaultSets: SetRow[] = Array.from({ length: sug.defaultSets }, () =>
      makeSet(sug.defaultReps, sug.defaultWeight, sug.defaultRest)
    );
    setSlots(prev => prev.map((s, i) => i !== activeSlotIdx ? s : {
      ...s, exercises: [...s.exercises, { id: uid(), name: sug.name, muscle: sug.muscle, group: sug.group, sets: defaultSets, tips: sug.tips }],
    }));
  }

  function addCustomExercise(name: string, group: string) {
    const slot = slots[activeSlotIdx];
    setSlots(prev => prev.map((s, i) => i !== activeSlotIdx ? s : {
      ...s, exercises: [...s.exercises, { id: uid(), name, muscle: group || slot.groups[0] || "Outros", group, sets: [makeSet()], tips: "" }],
    }));
  }

  function removeExercise(exId: string) {
    setSlots(prev => prev.map((s, i) =>
      i !== activeSlotIdx ? s : { ...s, exercises: s.exercises.filter(e => e.id !== exId) }
    ));
  }

  function addSet(exId: string) {
    setSlots(prev => prev.map((s, i) => i !== activeSlotIdx ? s : {
      ...s, exercises: s.exercises.map(e => e.id !== exId ? e : {
        ...e, sets: [...e.sets, makeSet(e.sets.at(-1)?.reps ?? 10, e.sets.at(-1)?.weight ?? 0, e.sets.at(-1)?.rest ?? 60)],
      }),
    }));
  }

  function removeSet(exId: string, setIdx: number) {
    setSlots(prev => prev.map((s, i) => i !== activeSlotIdx ? s : {
      ...s, exercises: s.exercises.map(e =>
        e.id !== exId ? e : { ...e, sets: e.sets.filter((_, j) => j !== setIdx) }
      ),
    }));
  }

  function updateSet(exId: string, setIdx: number, field: keyof SetRow, value: number) {
    setSlots(prev => prev.map((s, i) => i !== activeSlotIdx ? s : {
      ...s, exercises: s.exercises.map(e =>
        e.id !== exId ? e : { ...e, sets: e.sets.map((set, j) => j !== setIdx ? set : { ...set, [field]: value }) }
      ),
    }));
  }

  return {
    step, setStep,
    selectedSplit, selectSplit,
    slots, activeSlotIdx, setActiveSlotIdx,
    addCustomSlot, updateSlotLabel, toggleSlotGroup, toggleSlotDay, toggleSlotTag, removeSlot, duplicateSlot,
    addExercise, addCustomExercise, removeExercise, addSet, removeSet, updateSet,
  };
}
