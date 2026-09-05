import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import EvolucaoPage from "@/app/(dashboard)/evolucao/page";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { BodyMeasurement } from "@/hooks/useBodyMeasurements";
import type { WeightGoal } from "@/hooks/useWeightGoals";

// ── matchMedia (useCountUp lê prefers-reduced-motion) ────────────────────────
function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches, media: query,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    })),
  });
}

// ── Hooks mockados (controláveis por teste) ─────────────────────────────────
const mCreate = vi.fn();
const mRemove = vi.fn();
const mReload = vi.fn();
let measurementsState: {
  measurements: BodyMeasurement[]; loading: boolean; error: string | null;
};
vi.mock("@/hooks/useBodyMeasurements", () => ({
  useBodyMeasurements: () => ({
    ...measurementsState, create: mCreate, remove: mRemove, reload: mReload,
  }),
}));

const gCreate = vi.fn();
const gRemove = vi.fn();
const gReload = vi.fn();
let goalsState: { goals: WeightGoal[]; loading: boolean; error: string | null };
vi.mock("@/hooks/useWeightGoals", () => ({
  useWeightGoals: () => ({ ...goalsState, create: gCreate, remove: gRemove, reload: gReload }),
}));

vi.mock("@/hooks/useBodyPhotos", () => ({
  useBodyPhotos: () => ({ photos: [], loading: false, error: null, upload: vi.fn(), remove: vi.fn(), reload: vi.fn() }),
}));

const meas = (id: number, measuredAt: string, weightKg: number, heightCm: number | null = null): BodyMeasurement =>
  ({ id, measuredAt, weightKg, heightCm, bodyFatPct: null, note: null });

const renderPage = () => render(<LanguageProvider><EvolucaoPage /></LanguageProvider>);

describe("EvolucaoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(false);
    try { sessionStorage.setItem("fitai:evolucao-intro-seen", "1"); } catch { /* noop */ }
    measurementsState = { measurements: [], loading: false, error: null };
    goalsState = { goals: [], loading: false, error: null };
  });

  afterEach(() => vi.restoreAllMocks());

  it("mostra as 4 sub-abas com 'Evolução' ativa por padrão", () => {
    renderPage();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map(t => t.textContent)).toEqual(["Evolução", "Fotos", "Medidas", "Meta"]);
    expect(screen.getByRole("tab", { name: "Evolução" })).toHaveAttribute("aria-selected", "true");
  });

  it("troca pra aba Medidas ao clicar", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "Medidas" }));
    expect(screen.getByRole("tab", { name: "Medidas" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Medidas atuais")).toBeInTheDocument();
  });

  it("aba Evolução com menos de 2 medidas mostra o placeholder e não monta o gráfico", () => {
    measurementsState.measurements = [meas(1, "2026-09-01", 82)];
    renderPage();
    expect(screen.getByText("Registre pelo menos duas medidas pra ver a evolução.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Evolução de peso" })).not.toBeInTheDocument();
  });

  it("aba Evolução com 2+ medidas monta o gráfico; IMC fica oculto sem altura", () => {
    measurementsState.measurements = [meas(2, "2026-09-10", 80), meas(1, "2026-09-01", 82)];
    renderPage();
    expect(screen.getByRole("img", { name: "Evolução de peso" })).toBeInTheDocument();
    expect(screen.getByText("IMC")).toBeInTheDocument();
    expect(screen.queryByText("Normal")).not.toBeInTheDocument();
  });

  it("aba Evolução mostra a faixa de IMC quando a medida mais recente tem altura", () => {
    measurementsState.measurements = [meas(2, "2026-09-10", 80, 180), meas(1, "2026-09-01", 82, 180)];
    renderPage();
    expect(screen.getByText("Normal")).toBeInTheDocument();
  });

  it("meta atingida usa o Verde-Conquista (.meta-track.reached) e o rótulo 'Meta atingida'", () => {
    goalsState.goals = [{
      id: 1, targetWeightKg: 75, targetDate: null, createdAt: "2026-09-05T00:00:00Z",
      startWeightKg: 82, currentWeightKg: 74, direction: "cut", achieved: true, achievedOn: "2026-11-10",
    }];
    const { container } = renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "Meta" }));
    expect(screen.getByText("Meta atingida")).toBeInTheDocument();
    expect(container.querySelector(".meta-track.reached")).toBeInTheDocument();
    expect(container.querySelector(".card-gain")).toBeInTheDocument();
  });

  it("salvar uma medida chama create e depois recarrega as metas (onChanged)", async () => {
    mCreate.mockResolvedValue(meas(99, "2026-09-12", 81));
    const { container } = renderPage();
    fireEvent.click(screen.getByRole("tab", { name: "Medidas" }));

    const weightInput = container.querySelectorAll('input[type="number"]')[0] as HTMLInputElement;
    fireEvent.change(weightInput, { target: { value: "81" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Salvar medida/ }));
    });

    expect(mCreate).toHaveBeenCalledWith(expect.objectContaining({ weightKg: 81 }));
    expect(mCreate.mock.calls[0][0].measuredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(gReload).toHaveBeenCalled();
  });

  it("estado de loading e de erro seguem o padrão de /progresso", () => {
    measurementsState.loading = true;
    const { rerender } = renderPage();
    expect(screen.getByRole("status")).toBeInTheDocument();

    measurementsState.loading = false;
    goalsState.error = "boom";
    rerender(<LanguageProvider><EvolucaoPage /></LanguageProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(mReload).toHaveBeenCalled();
    expect(gReload).toHaveBeenCalled();
  });
});
