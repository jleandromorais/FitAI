import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useProgressStats } from "@/hooks/useProgressStats";
import type { ProgressData } from "@/hooks/useProgress";
import type { SessionHistory } from "@/hooks/useSessions";

const PROGRESS_DATA: ProgressData = {
  totalVolume: 5000,
  totalSetsCompleted: 40,
  totalWorkouts: 5,
  volumePerWorkout: [1000, 2000, 2000],
  workoutLabels: ["Treino A", "Treino B", "Treino C"],
  exercises: [
    { name: "Supino Reto", muscle: "Peitoral", currentWeight: 70, prevWeight: 60, delta: 10, totalSets: 4 },
    { name: "Agachamento", muscle: "Pernas", currentWeight: 100, prevWeight: 90, delta: 10, totalSets: 4 },
    { name: "Rosca Direta", muscle: "Bíceps", currentWeight: 20, prevWeight: 0, delta: 0, totalSets: 3 },
    { name: "Remada Curvada", muscle: "Costas", currentWeight: 60, prevWeight: 65, delta: -5, totalSets: 4 },
  ],
};

const NOW = new Date("2026-06-01T12:00:00Z").getTime();

function makeSessions(count: number): SessionHistory[] {
  return Array.from({ length: count }, (_, i) => ({
    workoutId: i,
    workoutName: `Treino ${i}`,
    workoutCode: "A",
    executedAt: new Date(NOW - i * 86400000).toISOString(),
    durationMinutes: 45,
    setsCompleted: 8,
    totalVolume: 500 + i * 10,
  }));
}

describe("useProgressStats", () => {
  it("filtra apenas exercícios com histórico real (current e prev > 0)", () => {
    const { result } = renderHook(() => useProgressStats(PROGRESS_DATA, [], 0, NOW));

    expect(result.current.exercisesWithLoad.map(e => e.name)).toEqual([
      "Supino Reto", "Agachamento", "Remada Curvada",
    ]);
  });

  it("seleciona o exercício pelo índice informado", () => {
    const { result } = renderHook(() => useProgressStats(PROGRESS_DATA, [], 1, NOW));
    expect(result.current.selectedEx?.name).toBe("Agachamento");
  });

  it("gera histórico de carga com os 2 pontos reais (prev e current)", () => {
    const { result } = renderHook(() => useProgressStats(PROGRESS_DATA, [], 0, NOW));
    expect(result.current.loadHistory).toEqual([60, 70]); // Supino Reto: prevWeight=60, currentWeight=70
  });

  it("prs contém apenas exercícios com delta positivo, ordenados decrescente", () => {
    const { result } = renderHook(() => useProgressStats(PROGRESS_DATA, [], 0, NOW));
    expect(result.current.prs.map(p => p.name)).toEqual(["Supino Reto", "Agachamento"]);
  });

  it("volumeStats calcula volume da semana e média por sessão", () => {
    const sessions = makeSessions(3); // todas dentro dos últimos 7 dias
    const { result } = renderHook(() => useProgressStats(PROGRESS_DATA, sessions, 0, NOW));

    const totalVol = sessions.reduce((s, x) => s + x.totalVolume, 0);
    expect(result.current.volumeStats.weekVolume).toBe(totalVol);
    expect(result.current.volumeStats.avgVolume).toBe(totalVol / 3);
    expect(result.current.volumeStats.sessionVolumes).toHaveLength(3);
  });

  it("muscleBreakdown agrega volume por grupo muscular ordenado decrescente", () => {
    const { result } = renderHook(() => useProgressStats(PROGRESS_DATA, [], 0, NOW));
    const muscles = result.current.muscleBreakdown.map(m => m.muscle);
    // Agachamento: 100*10*4=4000 é o maior volume estimado
    expect(muscles[0]).toBe("Pernas");
  });

  it("topExercisesByVolume ordena por volume estimado decrescente, só com prevWeight > 0", () => {
    const { result } = renderHook(() => useProgressStats(PROGRESS_DATA, [], 0, NOW));
    const names = result.current.topExercisesByVolume.map(e => e.name);
    expect(names).not.toContain("Rosca Direta"); // prevWeight = 0
    expect(names[0]).toBe("Agachamento"); // 100*10*4 = 4000, maior volume
  });

  it("retorna estruturas vazias quando data é null", () => {
    const { result } = renderHook(() => useProgressStats(null, [], 0, NOW));
    expect(result.current.exercisesWithLoad).toEqual([]);
    expect(result.current.prs).toEqual([]);
    expect(result.current.muscleBreakdown).toEqual([]);
    expect(result.current.topExercisesByVolume).toEqual([]);
  });
});
