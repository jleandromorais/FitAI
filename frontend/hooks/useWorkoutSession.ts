"use client";

import { useState } from "react";
import { Exercise, Workout } from "@/hooks/useWorkouts";
import { useStopwatch, useCountdown } from "@/hooks/useCountdown";
import { api } from "@/lib/api";

// Estado de cada série durante a execução — o utilizador pode alterar peso e reps
export interface LiveSet {
  weight: number;
  reps: number;
  done: boolean;
  // prev já vem do workout original (última sessão)
  prev: number;
}

// Estado de cada exercício durante a execução
export interface LiveExercise {
  id: number | undefined;
  name: string;
  muscle: string;
  restSeconds: number;
  sets: LiveSet[];
}

export interface SessionResult {
  setsCompleted: number;
  totalVolume: number;
  durationMinutes: number;
}

// Converte Exercise[] do backend para LiveExercise[] editável
function toLiveExercises(exercises: Exercise[]): LiveExercise[] {
  return exercises.map(ex => ({
    id: ex.id,
    name: ex.name,
    muscle: ex.muscle,
    restSeconds: ex.restSeconds ?? 60,
    sets: ex.sets.map(s => ({
      weight: s.weight ?? 0,
      reps: s.reps ?? 10,
      done: false, // começa não feita — o utilizador marca durante a sessão
      prev: s.prev ?? 0,
    })),
  }));
}

/** Encapsula todo o estado e as transições de uma sessão de treino ao vivo. */
export function useWorkoutSession(workout: Workout | null) {
  const [executing, setExecuting] = useState(false);
  const [liveExercises, setLiveExercises] = useState<LiveExercise[]>([]);
  const [focusedEx, setFocusedEx] = useState(0);
  const [notes, setNotes] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);

  const session = useStopwatch();
  const rest = useCountdown();

  function startSession() {
    if (!workout) return;
    setLiveExercises(toLiveExercises(workout.exercises));
    session.reset();
    rest.skip();
    setNotes("");
    setFocusedEx(0);
    setExecuting(true);
    session.start();
  }

  function stopSession() {
    session.stop();
    setExecuting(false);
  }

  function toggleSet(exIdx: number, setIdx: number) {
    setLiveExercises(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      const sets = ex.sets.map((s, si) => {
        if (si !== setIdx) return s;
        const nowDone = !s.done;
        if (nowDone) rest.start(ex.restSeconds);
        return { ...s, done: nowDone };
      });
      return { ...ex, sets };
    }));
    setFocusedEx(exIdx);
  }

  function updateLiveSet(exIdx: number, setIdx: number, field: "weight" | "reps", value: number) {
    setLiveExercises(prev => prev.map((ex, ei) =>
      ei !== exIdx ? ex : {
        ...ex,
        sets: ex.sets.map((s, si) =>
          si !== setIdx ? s : { ...s, [field]: value }
        ),
      }
    ));
  }

  async function handleFinish() {
    if (!workout) return;
    session.stop();
    setFinishing(true);

    const payload = {
      durationMinutes: Math.round(session.seconds / 60),
      notes,
      exercises: liveExercises
        .filter(ex => ex.id != null)
        .map(ex => ({
          exerciseId: ex.id as number,
          sets: ex.sets.map((s, idx) => ({
            setIndex: idx,
            weight: s.weight,
            reps: s.reps,
            done: s.done,
          })),
        })),
    };

    try {
      const result = await api.post<SessionResult>(`/workouts/${workout.id}/session`, payload);
      setSessionResult(result);
    } catch {
      // Mesmo com erro de rede, mostra o resumo local
      const doneSets = liveExercises.flatMap(ex => ex.sets).filter(s => s.done).length;
      const vol = liveExercises.flatMap(ex => ex.sets)
        .filter(s => s.done)
        .reduce((sum, s) => sum + s.weight * s.reps, 0);
      setSessionResult({ setsCompleted: doneSets, totalVolume: vol, durationMinutes: Math.round(session.seconds / 60) });
    } finally {
      setFinishing(false);
    }
  }

  const allSets = liveExercises.flatMap(ex => ex.sets);
  const doneSetsCount = allSets.filter(s => s.done).length;
  const totalSetsCount = allSets.length;
  const progress = totalSetsCount > 0 ? (doneSetsCount / totalSetsCount) * 100 : 0;
  const liveVolume = allSets.filter(s => s.done).reduce((sum, s) => sum + s.weight * s.reps, 0);

  return {
    executing,
    liveExercises,
    focusedEx,
    notes,
    setNotes,
    finishing,
    sessionResult,
    sessionSeconds: session.seconds,
    restTimer: rest.remaining,
    startSession,
    stopSession,
    toggleSet,
    updateLiveSet,
    handleFinish,
    startRestTimer: rest.start,
    skipRestTimer: rest.skip,
    addRestSeconds: rest.addSeconds,
    doneSetsCount,
    totalSetsCount,
    progress,
    liveVolume,
  };
}
