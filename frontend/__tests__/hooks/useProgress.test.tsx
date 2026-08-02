import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useProgress } from "@/hooks/useProgress";
import type { ProgressData } from "@/hooks/useProgress";

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

const PROGRESS_FIXTURE: ProgressData = {
  totalVolume: 5000, totalSetsCompleted: 40, totalWorkouts: 5,
  volumePerWorkout: [], workoutLabels: [], exercises: [], currentStreak: 3,
};

describe("useProgress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("inicia com loading=true e data null", () => {
    mockApi.get.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useProgress());
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBeNull();
  });

  it("carrega os dados com sucesso e mantém error null", async () => {
    mockApi.get.mockResolvedValue(PROGRESS_FIXTURE);
    const { result } = renderHook(() => useProgress());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual(PROGRESS_FIXTURE);
    expect(result.current.error).toBeNull();
  });

  it("seta error quando a API falha", async () => {
    mockApi.get.mockRejectedValue(new Error("Servidor indisponível"));
    const { result } = renderHook(() => useProgress());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Servidor indisponível");
    expect(result.current.data).toBeNull();
  });

  it("usa a mensagem de erro genérica quando a rejeição não é uma instância de Error", async () => {
    // Rejeição propositalmente não-Error, para exercitar String(err) em vez de err.message
    mockApi.get.mockRejectedValue("timeout string cru");
    const { result } = renderHook(() => useProgress());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("timeout string cru");
  });
});
