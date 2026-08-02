import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useWorkouts, useWorkout } from "@/hooks/useWorkouts";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { api } from "@/lib/api";

const mockApi = api as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const WORKOUT_FIXTURE = {
  id: 1,
  name: "Treino A",
  code: "A",
  schedule: "Seg, Qua",
  tags: ["Hipertrofia"],
  exercises: [],
  duration: 60,
  totalSets: 12,
  volume: 1500,
};

describe("useWorkouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("inicia com loading=true e lista vazia", () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useWorkouts());
    expect(result.current.loading).toBe(true);
    expect(result.current.workouts).toEqual([]);
  });

  it("carrega treinos com sucesso", async () => {
    mockApi.get.mockResolvedValue([WORKOUT_FIXTURE]);
    const { result } = renderHook(() => useWorkouts());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.workouts).toEqual([WORKOUT_FIXTURE]);
    expect(result.current.error).toBeNull();
  });

  it("seta error quando a API falha", async () => {
    mockApi.get.mockRejectedValue(new Error("Servidor indisponível"));
    const { result } = renderHook(() => useWorkouts());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Servidor indisponível");
    expect(result.current.workouts).toEqual([]);
  });

  it("createWorkout adiciona treino ao estado", async () => {
    mockApi.get.mockResolvedValue([]);
    mockApi.post.mockResolvedValue(WORKOUT_FIXTURE);

    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.createWorkout({
        name: "Treino A",
        code: "A",
        schedule: "Seg",
        tags: [],
        exercises: [],
        lastDone: undefined,
      });
    });

    expect(result.current.workouts).toHaveLength(1);
    expect(result.current.workouts[0].id).toBe(1);
  });

  it("updateWorkout substitui treino no estado", async () => {
    const atualizado = { ...WORKOUT_FIXTURE, name: "Treino A Editado" };
    mockApi.get.mockResolvedValue([WORKOUT_FIXTURE]);
    mockApi.put.mockResolvedValue(atualizado);

    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.updateWorkout(1, {
        name: "Treino A Editado",
        code: "A",
        schedule: "Seg",
        tags: [],
        exercises: [],
      });
    });

    expect(result.current.workouts[0].name).toBe("Treino A Editado");
  });

  it("deleteWorkout remove treino do estado", async () => {
    mockApi.get.mockResolvedValue([WORKOUT_FIXTURE]);
    mockApi.delete.mockResolvedValue(null);

    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteWorkout(1);
    });

    expect(result.current.workouts).toHaveLength(0);
  });

  it("reload limpa o error imediatamente (antes do novo fetch resolver), e mostra loading", async () => {
    mockApi.get.mockRejectedValueOnce(new Error("Servidor indisponível"));
    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Servidor indisponível");

    let resolveReload!: (data: typeof WORKOUT_FIXTURE[]) => void;
    mockApi.get.mockReturnValue(new Promise(r => { resolveReload = r; }));

    act(() => { result.current.reload(); });

    // limpo de imediato — não precisa esperar o fetch terminar pra sumir o "Erro" estagnado
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => { resolveReload([WORKOUT_FIXTURE]); });
    expect(result.current.workouts).toEqual([WORKOUT_FIXTURE]);
  });

  it("reload após uma falha não-Error também limpa o error de fallback quando o novo fetch tem sucesso", async () => {
    mockApi.get.mockRejectedValueOnce("timeout string cru").mockResolvedValueOnce([WORKOUT_FIXTURE]);

    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Erro ao carregar treinos.");

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.error).toBeNull();
    expect(result.current.workouts).toEqual([WORKOUT_FIXTURE]);
  });

  it("reload recarrega os treinos", async () => {
    mockApi.get.mockResolvedValueOnce([]).mockResolvedValueOnce([WORKOUT_FIXTURE]);

    const { result } = renderHook(() => useWorkouts());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.workouts).toHaveLength(0);

    await act(async () => {
      await result.current.reload();
    });

    expect(result.current.workouts).toHaveLength(1);
  });
});

describe("useWorkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("carrega treino por id", async () => {
    mockApi.get.mockResolvedValue(WORKOUT_FIXTURE);
    const { result } = renderHook(() => useWorkout("1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.workout).toEqual(WORKOUT_FIXTURE);
    expect(result.current.error).toBeNull();
  });

  it("seta error quando treino não é encontrado", async () => {
    mockApi.get.mockRejectedValue(new Error("Treino não encontrado"));
    const { result } = renderHook(() => useWorkout("999"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Treino não encontrado");
    expect(result.current.workout).toBeNull();
  });

  it("saveExercises atualiza o treino via API", async () => {
    const exerciciosNovos = [
      { id: 1, name: "Supino", muscle: "Peito", restSeconds: 90, sets: [] },
    ];
    const atualizado = { ...WORKOUT_FIXTURE, exercises: exerciciosNovos };
    mockApi.get.mockResolvedValue(WORKOUT_FIXTURE);
    mockApi.put.mockResolvedValue(atualizado);

    const { result } = renderHook(() => useWorkout("1"));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveExercises(exerciciosNovos);
    });

    expect(mockApi.put).toHaveBeenCalledWith("/workouts/1", expect.objectContaining({
      exercises: exerciciosNovos,
    }));
    expect(result.current.workout?.exercises).toEqual(exerciciosNovos);
  });

  it("trocar de id após uma falha limpa o error anterior quando o novo id carrega com sucesso", async () => {
    mockApi.get.mockRejectedValueOnce(new Error("Treino não encontrado"));
    const { result, rerender } = renderHook(({ id }) => useWorkout(id), { initialProps: { id: "999" } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Treino não encontrado");

    mockApi.get.mockResolvedValueOnce(WORKOUT_FIXTURE);
    rerender({ id: "1" });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.workout).toEqual(WORKOUT_FIXTURE);
  });

  it("saveExercises não faz nada quando workout é null", async () => {
    mockApi.get.mockRejectedValue(new Error("404"));
    const { result } = renderHook(() => useWorkout("999"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.saveExercises([]);
    });

    expect(mockApi.put).not.toHaveBeenCalled();
  });
});
