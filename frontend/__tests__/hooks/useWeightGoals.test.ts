import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useWeightGoals, type WeightGoal } from "@/hooks/useWeightGoals";

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { api } from "@/lib/api";
const mockApi = api as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const GOAL: WeightGoal = {
  id: 1, targetWeightKg: 75, targetDate: null, createdAt: "2026-09-05T00:00:00Z",
  startWeightKg: 82, currentWeightKg: 80, direction: "cut", achieved: false, achievedOn: null,
};

describe("useWeightGoals", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("inicia com loading=true e goals vazio", () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useWeightGoals());
    expect(result.current.loading).toBe(true);
    expect(result.current.goals).toEqual([]);
  });

  it("carrega as metas e mantém error null", async () => {
    mockApi.get.mockResolvedValue([GOAL]);
    const { result } = renderHook(() => useWeightGoals());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.goals).toEqual([GOAL]);
    expect(result.current.error).toBeNull();
  });

  it("seta error quando a API falha", async () => {
    mockApi.get.mockRejectedValue(new Error("Servidor indisponível"));
    const { result } = renderHook(() => useWeightGoals());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Servidor indisponível");
  });

  it("reload limpa o error imediatamente, antes do novo fetch resolver", async () => {
    mockApi.get.mockRejectedValueOnce(new Error("Servidor indisponível"));
    const { result } = renderHook(() => useWeightGoals());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("Servidor indisponível");

    let resolveReload!: (data: WeightGoal[]) => void;
    mockApi.get.mockReturnValue(new Promise(r => { resolveReload = r; }));

    act(() => { result.current.reload(); });

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();

    await act(async () => { resolveReload([GOAL]); });
    expect(result.current.goals).toEqual([GOAL]);
  });

  it("reload re-busca do backend (é o que a página chama após mexer numa medida)", async () => {
    const reached: WeightGoal = { ...GOAL, achieved: true, achievedOn: "2026-11-10", currentWeightKg: 74.5 };
    mockApi.get.mockResolvedValueOnce([GOAL]).mockResolvedValueOnce([reached]);

    const { result } = renderHook(() => useWeightGoals());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.goals[0].achieved).toBe(false);

    await act(async () => { await result.current.reload(); });
    expect(result.current.goals[0].achieved).toBe(true);
    expect(mockApi.get).toHaveBeenCalledTimes(2);
  });

  it("create envia POST e prepende a meta criada", async () => {
    mockApi.get.mockResolvedValue([]);
    mockApi.post.mockResolvedValue(GOAL);

    const { result } = renderHook(() => useWeightGoals());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.create({ targetWeightKg: 75 }); });

    expect(mockApi.post).toHaveBeenCalledWith("/body-weight-goals", { targetWeightKg: 75 });
    expect(result.current.goals).toEqual([GOAL]);
  });

  it("remove chama DELETE e tira a meta da lista", async () => {
    mockApi.get.mockResolvedValue([GOAL]);
    mockApi.delete.mockResolvedValue(null);

    const { result } = renderHook(() => useWeightGoals());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.remove(1); });

    expect(mockApi.delete).toHaveBeenCalledWith("/body-weight-goals/1");
    expect(result.current.goals).toEqual([]);
  });
});
