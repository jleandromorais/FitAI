import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWorkoutSession } from "@/hooks/useWorkoutSession";
import type { Workout } from "@/hooks/useWorkouts";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from "@/lib/api";

const mockApi = api as unknown as { post: ReturnType<typeof vi.fn> };

const WORKOUT: Workout = {
  id: 1,
  name: "Treino A",
  code: "A",
  schedule: "Seg, Qua",
  tags: ["Hipertrofia"],
  duration: 60,
  totalSets: 2,
  volume: 0,
  exercises: [
    {
      id: 10,
      name: "Supino Reto",
      muscle: "Peitoral",
      restSeconds: 90,
      sets: [
        { reps: 10, weight: 60, done: false, prev: 55 },
        { reps: 10, weight: 60, done: false, prev: 55 },
      ],
    },
  ],
};

describe("useWorkoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("inicia não-executando, sem exercícios ao vivo", () => {
    const { result } = renderHook(() => useWorkoutSession(WORKOUT));
    expect(result.current.executing).toBe(false);
    expect(result.current.liveExercises).toEqual([]);
  });

  it("startSession popula liveExercises e liga o cronómetro", () => {
    const { result } = renderHook(() => useWorkoutSession(WORKOUT));

    act(() => result.current.startSession());

    expect(result.current.executing).toBe(true);
    expect(result.current.liveExercises).toHaveLength(1);
    expect(result.current.liveExercises[0].sets).toHaveLength(2);
    expect(result.current.liveExercises[0].sets[0].done).toBe(false);

    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.sessionSeconds).toBe(3);
  });

  it("toggleSet marca a série como feita e inicia o timer de descanso", () => {
    const { result } = renderHook(() => useWorkoutSession(WORKOUT));
    act(() => result.current.startSession());

    act(() => result.current.toggleSet(0, 0));

    expect(result.current.liveExercises[0].sets[0].done).toBe(true);
    expect(result.current.restTimer).toBe(90);
    expect(result.current.doneSetsCount).toBe(1);
    expect(result.current.totalSetsCount).toBe(2);
    expect(result.current.progress).toBe(50);
    expect(result.current.liveVolume).toBe(600); // 60kg × 10 reps
  });

  it("toggleSet desmarca a série ao chamar novamente", () => {
    const { result } = renderHook(() => useWorkoutSession(WORKOUT));
    act(() => result.current.startSession());

    act(() => result.current.toggleSet(0, 0));
    act(() => result.current.toggleSet(0, 0));

    expect(result.current.liveExercises[0].sets[0].done).toBe(false);
    expect(result.current.doneSetsCount).toBe(0);
  });

  it("updateLiveSet altera peso/reps de uma série específica", () => {
    const { result } = renderHook(() => useWorkoutSession(WORKOUT));
    act(() => result.current.startSession());

    act(() => result.current.updateLiveSet(0, 1, "weight", 70));

    expect(result.current.liveExercises[0].sets[1].weight).toBe(70);
    expect(result.current.liveExercises[0].sets[0].weight).toBe(60); // outras séries intactas
  });

  it("skipRestTimer e addRestSeconds controlam o timer de descanso", () => {
    const { result } = renderHook(() => useWorkoutSession(WORKOUT));
    act(() => result.current.startSession());
    act(() => result.current.toggleSet(0, 0));

    expect(result.current.restTimer).toBe(90);

    act(() => result.current.addRestSeconds(30));
    expect(result.current.restTimer).toBe(120);

    act(() => result.current.skipRestTimer());
    expect(result.current.restTimer).toBeNull();
  });

  it("handleFinish envia a sessão para a API e guarda o resultado", async () => {
    mockApi.post.mockResolvedValue({ setsCompleted: 1, totalVolume: 600, durationMinutes: 5 });
    const { result } = renderHook(() => useWorkoutSession(WORKOUT));
    act(() => result.current.startSession());
    act(() => result.current.toggleSet(0, 0));

    await act(async () => {
      await result.current.handleFinish();
    });

    expect(mockApi.post).toHaveBeenCalledWith("/workouts/1/session", expect.objectContaining({
      exercises: [expect.objectContaining({ exerciseId: 10 })],
    }));
    expect(result.current.sessionResult).toEqual({ setsCompleted: 1, totalVolume: 600, durationMinutes: 5 });
    expect(result.current.finishing).toBe(false);
  });

  it("handleFinish usa resumo local quando a API falha", async () => {
    mockApi.post.mockRejectedValue(new Error("Falha de rede"));
    const { result } = renderHook(() => useWorkoutSession(WORKOUT));
    act(() => result.current.startSession());
    act(() => result.current.toggleSet(0, 0));

    await act(async () => {
      await result.current.handleFinish();
    });

    expect(result.current.sessionResult).not.toBeNull();
    expect(result.current.sessionResult?.setsCompleted).toBe(1);
    expect(result.current.sessionResult?.totalVolume).toBe(600);
  });

  it("stopSession para o cronómetro e sai do modo de execução", () => {
    const { result } = renderHook(() => useWorkoutSession(WORKOUT));
    act(() => result.current.startSession());
    act(() => vi.advanceTimersByTime(2000));

    act(() => result.current.stopSession());
    expect(result.current.executing).toBe(false);

    const secondsAtStop = result.current.sessionSeconds;
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.sessionSeconds).toBe(secondsAtStop); // não avança mais
  });
});
