"use client";

import { useCallback, useState } from "react";
import { ExerciseRow, SetRow, makeSet, uid } from "@/lib/workout-shared";
import { ExerciseSuggestion } from "@/lib/exercises";

/**
 * Gerencia um único ExerciseRow[] (adicionar/remover exercícios e séries).
 * Usado por EditarTreinoModal (uma lista) e, uma instância por bloco, por
 * NovoTreinoModal (múltiplas listas, uma por slot do wizard).
 */
export function useExerciseRows(initial: ExerciseRow[] = []) {
  const [exercises, setExercises] = useState<ExerciseRow[]>(initial);

  const addExercise = useCallback((sug: ExerciseSuggestion) => {
    setExercises(prev => [...prev, {
      id: uid(), name: sug.name, muscle: sug.muscle, group: sug.group, tips: sug.tips,
      sets: Array.from({ length: sug.defaultSets }, () => makeSet(sug.defaultReps, sug.defaultWeight, sug.defaultRest)),
    }]);
  }, []);

  const addCustomExercise = useCallback((name: string, group: string) => {
    const resolvedGroup = group || "Outros";
    setExercises(prev => [...prev, { id: uid(), name, muscle: resolvedGroup, group: resolvedGroup, tips: "", sets: [makeSet()] }]);
  }, []);

  const removeExercise = useCallback((id: string) => {
    setExercises(prev => prev.filter(e => e.id !== id));
  }, []);

  const addSet = useCallback((exId: string) => {
    setExercises(prev => prev.map(e => e.id !== exId ? e : {
      ...e, sets: [...e.sets, makeSet(e.sets.at(-1)?.reps ?? 10, e.sets.at(-1)?.weight ?? 0, e.sets.at(-1)?.rest ?? 60)],
    }));
  }, []);

  const removeSet = useCallback((exId: string, i: number) => {
    setExercises(prev => prev.map(e => e.id !== exId ? e : { ...e, sets: e.sets.filter((_, j) => j !== i) }));
  }, []);

  const updateSet = useCallback((exId: string, i: number, field: keyof SetRow, value: number) => {
    setExercises(prev => prev.map(e => e.id !== exId ? e : {
      ...e, sets: e.sets.map((s, j) => j !== i ? s : { ...s, [field]: value }),
    }));
  }, []);

  return { exercises, setExercises, addExercise, addCustomExercise, removeExercise, addSet, removeSet, updateSet };
}
