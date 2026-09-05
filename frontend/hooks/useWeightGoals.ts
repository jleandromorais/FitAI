"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface WeightGoal {
  id: number;
  targetWeightKg: number;
  targetDate: string | null;
  createdAt: string;             // ISO instant
  // Derivados no backend a partir das medidas reais — nunca gravados. Ver
  // BodyWeightGoalService.evaluate / "Regra da Honestidade do Painel".
  startWeightKg: number | null;
  currentWeightKg: number | null;
  direction: "cut" | "bulk" | null;
  achieved: boolean;
  achievedOn: string | null;
}

export interface NewWeightGoal {
  targetWeightKg: number;
  targetDate?: string | null;
}

// A página chama reload() daqui depois de criar/apagar uma medida — o cálculo
// de achieved/currentWeightKg mora no backend, então o front só re-busca.
export function useWeightGoals() {
  const [goals, setGoals] = useState<WeightGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function fetchGoals() {
    setError(null);
    return api.get<WeightGoal[]>("/body-weight-goals")
      .then(data => setGoals(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchGoals();
  }, []);

  async function reload() {
    setLoading(true);
    setError(null);
    await fetchGoals();
  }

  async function create(body: NewWeightGoal): Promise<WeightGoal> {
    const created = await api.post<WeightGoal>("/body-weight-goals", body);
    setGoals(prev => [created, ...prev]);
    return created;
  }

  async function remove(id: number) {
    await api.delete(`/body-weight-goals/${id}`);
    setGoals(prev => prev.filter(g => g.id !== id));
  }

  return { goals, loading, error, create, remove, reload };
}
