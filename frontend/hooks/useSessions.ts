"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface SessionHistory {
  workoutId: number;
  workoutName: string;
  workoutCode: string;
  executedAt: string;
  durationMinutes: number;
  setsCompleted: number;
  totalVolume: number;
}

export function useSessions(days = 30) {
  const [sessions, setSessions] = useState<SessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<SessionHistory[]>(`/workouts/sessions/recent?days=${days}`)
      .then(data => { setSessions(data); setError(null); })
      // Erro real (rede, 500) fica visível em `error` — não vira silenciosamente
      // "0 sessões", que um chamador não consegue distinguir de "sem treinos mesmo".
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Erro ao carregar sessões."))
      .finally(() => setLoading(false));
  }, [days]);

  return { sessions, loading, error };
}
