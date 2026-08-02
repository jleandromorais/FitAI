"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

// ── Tipos espelhando o ProgressDto do backend ─────────────────────────────────

export interface ExerciseProgress {
  name: string;
  muscle: string;
  currentWeight: number;
  prevWeight: number;
  delta: number;        // ganho de carga vs sessão anterior
  totalSets: number;
}

export interface ProgressData {
  totalVolume: number;
  totalSetsCompleted: number;
  totalWorkouts: number;
  volumePerWorkout: number[];   // volume de cada treino (para o gráfico de barras)
  workoutLabels: string[];      // nome de cada treino (mesmo índice que volumePerWorkout)
  exercises: ExerciseProgress[]; // exercícios ordenados por delta decrescente
  currentStreak: number;        // dias consecutivos treinados nos dias agendados
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useProgress() {
  const [data, setData]       = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  function fetchProgress() {
    return api.get<ProgressData>("/workouts/progress")
      .then(fetched => { setData(fetched); setError(null); })
      .catch(err => {
        // Mostra o erro real para facilitar o diagnóstico
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[useProgress] erro:", msg);
        setError(msg);
      })
      .finally(() => setLoading(false));
  }

  // Recarga manual (ex: botão de "tentar novamente") — mostra o loading de novo
  // e limpa um error anterior imediatamente, sem esperar o novo fetch resolver.
  async function reload() {
    setLoading(true);
    setError(null);
    await fetchProgress();
  }

  useEffect(() => {
    fetchProgress();
  }, []);

  return { data, loading, error, reload };
}
