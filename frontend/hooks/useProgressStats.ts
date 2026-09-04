"use client";

import { useMemo } from "react";
import { ExerciseProgress, ProgressData } from "@/hooks/useProgress";
import { SessionHistory } from "@/hooks/useSessions";

/**
 * Devolve os dois únicos pontos de carga que realmente temos — peso da
 * sessão anterior (prev) e peso atual. Não há histórico granular por sessão
 * armazenado ainda, então não interpola pontos intermédios fictícios entre
 * eles (isso mostraria uma "evolução" que nunca foi medida de verdade).
 */
function buildLoadHistory(ex: ExerciseProgress): number[] {
  if (ex.prevWeight <= 0) return [ex.currentWeight];
  return [ex.prevWeight, ex.currentWeight];
}

export interface MuscleVolumeEntry {
  muscle: string;
  volume: number;
}

export interface ExerciseVolumeEntry extends ExerciseProgress {
  vol: number;
}

/**
 * Deriva e memoiza todos os dados calculados a partir de progress + sessions.
 * `now` (epoch ms) fica a cargo de quem chama — mantém o hook puro, já que
 * `Date.now()` não pode ser lido diretamente durante a renderização.
 */
export function useProgressStats(
  data: ProgressData | null,
  sessions: SessionHistory[],
  exIdx: number,
  now: number
) {
  // Só mostra exercícios com histórico real (executados ao menos duas vezes)
  const exercisesWithLoad = useMemo(
    () => data?.exercises.filter(e => e.currentWeight > 0 && e.prevWeight > 0) ?? [],
    [data]
  );

  const selectedEx = exercisesWithLoad[exIdx] ?? data?.exercises[0];
  const loadHistory = useMemo(() => (selectedEx ? buildLoadHistory(selectedEx) : []), [selectedEx]);

  // PRs: exercícios com maior delta positivo (ganho de carga) — exige
  // prevWeight > 0 (mesma regra de exercisesWithLoad/topExercisesByVolume)
  // pra não contar a primeira vez que um exercício é feito como "recorde":
  // sem sessão anterior pra comparar, delta = currentWeight (prevWeight=0),
  // o que não é um ganho de carga de verdade.
  const prs = useMemo(() => {
    if (!data) return [];
    return [...data.exercises]
      .filter(e => e.delta > 0 && e.currentWeight > 0 && e.prevWeight > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 8);
  }, [data]);

  const volumeStats = useMemo(() => {
    const weekAgo = now - 7 * 86400000;
    const thisWeek = sessions.filter(s => new Date(s.executedAt).getTime() > weekAgo);
    const weekVolume = thisWeek.reduce((sum, s) => sum + (s.totalVolume ?? 0), 0);
    const avgVolume = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + (s.totalVolume ?? 0), 0) / sessions.length
      : 0;
    // Volume por sessão (últimas 12) para gráfico de linha
    const sessionVolumes = [...sessions].reverse().slice(-12).map(s => s.totalVolume ?? 0);

    return { weekVolume, avgVolume, sessionVolumes };
  }, [sessions, now]);

  // Volume real (peso × reps das séries feitas, vindo do backend) — nunca uma
  // estimativa de reps assumida. Ver ExerciseProgressDto.volume no backend.
  const muscleBreakdown = useMemo<MuscleVolumeEntry[]>(() => {
    if (!data) return [];
    const muscleVol: Record<string, number> = {};
    for (const ex of data.exercises) {
      const m = ex.muscle?.split(" ")?.[0] ?? "Outros";
      muscleVol[m] = (muscleVol[m] ?? 0) + (ex.volume ?? 0);
    }
    return Object.entries(muscleVol)
      .map(([muscle, volume]) => ({ muscle, volume }))
      .filter(m => m.volume > 0)
      .sort((a, b) => b.volume - a.volume);
  }, [data]);

  const topExercisesByVolume = useMemo<ExerciseVolumeEntry[]>(() => {
    if (!data) return [];
    return [...data.exercises]
      .filter(e => e.prevWeight > 0 && e.volume > 0)
      .map(e => ({ ...e, vol: e.volume }))
      .sort((a, b) => b.vol - a.vol)
      .slice(0, 8);
  }, [data]);

  return { exercisesWithLoad, selectedEx, loadHistory, prs, volumeStats, muscleBreakdown, topExercisesByVolume };
}
