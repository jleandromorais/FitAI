"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface SetData {
  id?: number;
  reps: number;
  weight: number;
  done: boolean;
  prev: number;
}

export interface Exercise {
  id?: number;
  name: string;
  muscle: string;
  restSeconds: number;
  sets: SetData[];
}

export interface Workout {
  id: number;
  name: string;
  code: string;
  schedule: string;
  tags: string[];
  exercises: Exercise[];
  duration: number;
  totalSets: number;
  volume: number;
  lastDone?: string;
}

export function useWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function fetchWorkouts() {
    return api.get<Workout[]>("/workouts")
      .then(data => { setWorkouts(data); setError(null); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Erro ao carregar treinos."))
      .finally(() => setLoading(false));
  }

  // Recarga manual (ex: após criar/editar um treino) — mostra o loading de novo
  // e limpa um error anterior imediatamente, sem esperar o novo fetch resolver.
  async function load() {
    setLoading(true);
    setError(null);
    await fetchWorkouts();
  }

  useEffect(() => {
    fetchWorkouts();
  }, []);

  async function createWorkout(req: Omit<Workout, "id" | "duration" | "totalSets" | "volume">) {
    const created = await api.post<Workout>("/workouts", req);
    setWorkouts(prev => [...prev, created]);
    return created;
  }

  // Atualiza um treino existente no backend e sincroniza o estado local
  async function updateWorkout(id: number, req: Omit<Workout, "id" | "duration" | "totalSets" | "volume">) {
    const updated = await api.put<Workout>(`/workouts/${id}`, req);
    setWorkouts(prev => prev.map(w => w.id === id ? updated : w));
    return updated;
  }

  async function deleteWorkout(id: number) {
    await api.delete(`/workouts/${id}`);
    setWorkouts(prev => prev.filter(w => w.id !== id));
  }

  return { workouts, loading, error, reload: load, createWorkout, updateWorkout, deleteWorkout };
}

export function useWorkout(id: string) {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Workout>(`/workouts/${id}`)
      .then(data => { setWorkout(data); setError(null); })
      .catch(err => setError(err instanceof Error ? err.message : "Erro."))
      .finally(() => setLoading(false));
  }, [id]);

  async function saveExercises(exercises: Exercise[]) {
    if (!workout) return;
    const updated = await api.put<Workout>(`/workouts/${id}`, {
      name: workout.name,
      code: workout.code,
      schedule: workout.schedule,
      tags: workout.tags,
      exercises,
    });
    setWorkout(updated);
  }

  return { workout, loading, error, saveExercises };
}
