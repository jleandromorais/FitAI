import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useBodyMeasurements, type BodyMeasurement } from "@/hooks/useBodyMeasurements";

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

const M = (id: number, measuredAt: string, weightKg: number): BodyMeasurement => ({
  id, measuredAt, weightKg, heightCm: null, bodyFatPct: null, note: null,
});

describe("useBodyMeasurements", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("carrega as medidas e mantém error null", async () => {
    mockApi.get.mockResolvedValue([M(2, "2026-09-08", 81), M(1, "2026-09-01", 82)]);
    const { result } = renderHook(() => useBodyMeasurements());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.measurements).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it("seta error quando a API falha", async () => {
    mockApi.get.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useBodyMeasurements());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("boom");
  });

  it("reload limpa o error imediatamente", async () => {
    mockApi.get.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useBodyMeasurements());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("boom");

    let resolveReload!: (d: BodyMeasurement[]) => void;
    mockApi.get.mockReturnValue(new Promise(r => { resolveReload = r; }));
    act(() => { result.current.reload(); });
    expect(result.current.error).toBeNull();

    await act(async () => { resolveReload([]); });
    expect(result.current.measurements).toEqual([]);
  });

  it("create posta e mantém a lista ordenada por data desc", async () => {
    mockApi.get.mockResolvedValue([M(1, "2026-09-01", 82)]);
    mockApi.post.mockResolvedValue(M(2, "2026-09-10", 80));

    const { result } = renderHook(() => useBodyMeasurements());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.create({ weightKg: 80, measuredAt: "2026-09-10" });
    });

    expect(mockApi.post).toHaveBeenCalledWith("/body-measurements", { weightKg: 80, measuredAt: "2026-09-10" });
    expect(result.current.measurements.map(m => m.id)).toEqual([2, 1]);
  });

  it("remove chama DELETE e tira a medida da lista", async () => {
    mockApi.get.mockResolvedValue([M(1, "2026-09-01", 82)]);
    mockApi.delete.mockResolvedValue(null);

    const { result } = renderHook(() => useBodyMeasurements());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.remove(1); });

    expect(mockApi.delete).toHaveBeenCalledWith("/body-measurements/1");
    expect(result.current.measurements).toEqual([]);
  });
});
