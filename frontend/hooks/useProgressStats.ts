"use client";

import { useMemo } from "react";
import { ExerciseProgress, ProgressData } from "@/hooks/useProgress";
import { SessionHistory } from "@/hooks/useSessions";

/**
 * Devolve uma sequência simulada de evolução de carga para o gráfico de linha.
 * Usa o peso anterior (prev) como ponto inicial e o atual como ponto final,
 * interpolando os valores intermédios.
 * Quando houver histórico real de sessões, substitui por dados reais.
 */
function buildLoadHistory(ex: ExerciseProgress): number[] {
  const start = ex.prevWeight > 0 ? ex.prevWeight : ex.currentWeight * 0.85;
  const end = ex.currentWeight;
  // Gera 8 pontos interpolados — suficiente para o gráfico ter forma
  return Array.from({ length: 8 }, (_, i) => {
    const t = i / 7;
    // Progressão não-linear para parecer mais realista
    return parseFloat((start + (end - start) * (t * t)).toFixed(1));
  });
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

  // PRs: exercícios com maior delta positivo (ganho de carga)
  const prs = useMemo(() => {
    if (!data) return [];
    return [...data.exercises]
      .filter(e => e.delta > 0 && e.currentWeight > 0)
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

  const muscleBreakdown = useMemo<MuscleVolumeEntry[]>(() => {
    if (!data) return [];
    const muscleVol: Record<string, number> = {};
    for (const ex of data.exercises) {
      const m = ex.muscle?.split(" ")?.[0] ?? "Outros";
      const vol = ex.currentWeight * 10 * ex.totalSets;
      muscleVol[m] = (muscleVol[m] ?? 0) + vol;
    }
    return Object.entries(muscleVol)
      .map(([muscle, volume]) => ({ muscle, volume }))
      .sort((a, b) => b.volume - a.volume);
  }, [data]);

  const topExercisesByVolume = useMemo<ExerciseVolumeEntry[]>(() => {
    if (!data) return [];
    return [...data.exercises]
      .filter(e => e.prevWeight > 0)
      .map(e => ({ ...e, vol: e.currentWeight * 10 * e.totalSets }))
      .sort((a, b) => b.vol - a.vol)
      .slice(0, 8);
  }, [data]);

  return { exercisesWithLoad, selectedEx, loadHistory, prs, volumeStats, muscleBreakdown, topExercisesByVolume };
}
