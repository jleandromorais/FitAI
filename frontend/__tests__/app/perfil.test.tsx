import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import PerfilPage from "@/app/(dashboard)/perfil/page";
import type { Workout } from "@/hooks/useWorkouts";
import type { ProgressData } from "@/hooks/useProgress";

const mockLogout = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { name: "Leandro Silva", email: "leandro@example.com" }, logout: mockLogout }),
}));

let mockWorkouts: Workout[] = [];
let mockWorkoutsLoading = false;
let mockWorkoutsError: string | null = null;
vi.mock("@/hooks/useWorkouts", () => ({
  useWorkouts: () => ({ workouts: mockWorkouts, loading: mockWorkoutsLoading, error: mockWorkoutsError }),
}));

// data começa/segue null até o primeiro fetch bem-sucedido — mesmo contrato de
// frontend/hooks/useProgress.ts (useState<ProgressData | null>(null)), não um
// valor "zerado" fabricado, para não mascarar a null-safety de `progress?.currentStreak ?? 0`.
let mockProgress: ProgressData | null = null;
let mockProgressLoading = false;
let mockProgressError: string | null = null;
vi.mock("@/hooks/useProgress", () => ({
  useProgress: () => ({ data: mockProgress, loading: mockProgressLoading, error: mockProgressError }),
}));

const ZERO_PROGRESS: ProgressData = {
  totalVolume: 0, totalSetsCompleted: 0, totalWorkouts: 0,
  volumePerWorkout: [], workoutLabels: [], exercises: [], currentStreak: 0,
};

function workout(volume: number, duration = 45): Workout {
  return { id: 1, name: "Treino A", code: "A", schedule: "seg,qua,sex", tags: [], exercises: [], duration, totalSets: 12, volume };
}

// Escopa asserções a um card específico de Lifetime (Treinos/Volume/Horas), já
// que "…"/"Erro" aparecem em vários lugares da página ao mesmo tempo.
// Acoplado à estrutura atual: o label (.h-eyebrow) e o valor são divs irmãos
// dentro de um wrapper comum — se isso mudar, este helper precisa acompanhar.
function statCard(label: string) {
  return screen.getByText(label).parentElement!;
}

describe("PerfilPage", () => {
  beforeEach(() => {
    mockLogout.mockClear();
    mockWorkouts = [];
    mockWorkoutsLoading = false;
    mockWorkoutsError = null;
    mockProgress = null;
    mockProgressLoading = false;
    mockProgressError = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("estado zero real (sem loading, sem erro, valores genuinamente zerados)", () => {
    beforeEach(() => {
      mockProgress = ZERO_PROGRESS;
    });

    it("mostra '0 dias streak' no chip e '—' nos 3 stats de Lifetime", () => {
      render(<PerfilPage />);
      expect(screen.getByText("0 dias streak 🔥")).toBeInTheDocument();
      expect(within(statCard("Lifetime · Treinos")).getByText("—")).toBeInTheDocument();
      expect(within(statCard("Lifetime · Volume")).getByText("—")).toBeInTheDocument();
      expect(within(statCard("Lifetime · Horas")).getByText("—")).toBeInTheDocument();
    });

    it("mostra 'Comece hoje' e '0/10' nas conquistas, com o número real no título (não fabricado)", () => {
      render(<PerfilPage />);
      expect(screen.getByText("Comece hoje")).toBeInTheDocument();
      expect(screen.getByText("0/10")).toBeInTheDocument();
      expect(screen.getByText("0 dias streak")).toBeInTheDocument();
    });
  });

  describe("estado de loading", () => {
    beforeEach(() => {
      mockWorkoutsLoading = true;
      mockProgressLoading = true;
      // mockProgress fica null — reflete o hook real antes do primeiro fetch resolver
    });

    it("mostra '…' no chip de streak e nos 3 stats de Lifetime, sem sufixo de unidade", () => {
      render(<PerfilPage />);
      expect(screen.getAllByText("…")).toHaveLength(4); // 1 chip + 3 stats
      expect(within(statCard("Lifetime · Treinos")).getByText("…")).toBeInTheDocument();
      expect(within(statCard("Lifetime · Volume")).getByText("…")).toBeInTheDocument();
      expect(within(statCard("Lifetime · Horas")).getByText("…")).toBeInTheDocument();
      expect(within(statCard("Lifetime · Volume")).queryByText("kg")).not.toBeInTheDocument();
      expect(within(statCard("Lifetime · Horas")).queryByText("h")).not.toBeInTheDocument();
    });

    it("mostra 'Carregando…' nas 5 conquistas, sem fabricar '0 dias streak' no título", () => {
      render(<PerfilPage />);
      expect(screen.getAllByText("Carregando…")).toHaveLength(5);
      expect(screen.queryByText("0 dias streak")).not.toBeInTheDocument();
      expect(screen.getByText("Streak")).toBeInTheDocument();
    });
  });

  describe("estado de erro", () => {
    beforeEach(() => {
      mockWorkoutsError = "Erro de rede";
      mockProgressError = "Erro de rede";
      // mockProgress fica null — .catch() nunca chamou setData, mesmo contrato do hook real
    });

    it("mostra 'Erro ao carregar streak' no chip e 'Erro' nos 3 stats de Lifetime", () => {
      render(<PerfilPage />);
      expect(screen.getByText("Erro ao carregar streak")).toBeInTheDocument();
      expect(within(statCard("Lifetime · Treinos")).getByText("Erro")).toBeInTheDocument();
      expect(within(statCard("Lifetime · Volume")).getByText("Erro")).toBeInTheDocument();
      expect(within(statCard("Lifetime · Horas")).getByText("Erro")).toBeInTheDocument();
    });

    it("mostra 'Erro ao carregar' nas 5 conquistas", () => {
      render(<PerfilPage />);
      expect(screen.getAllByText("Erro ao carregar")).toHaveLength(5);
    });
  });

  describe("estado misto (um hook falha com data=null, o outro tem sucesso)", () => {
    beforeEach(() => {
      mockProgressError = "Erro de rede";
      mockWorkouts = [workout(3200)];
    });

    it("mostra dados reais de Treinos/Volume/Horas mesmo com o streak em erro", () => {
      render(<PerfilPage />);
      expect(within(statCard("Lifetime · Treinos")).getByText("1")).toBeInTheDocument();
      expect(within(statCard("Lifetime · Volume")).getByText("3.2k")).toBeInTheDocument();
      expect(within(statCard("Lifetime · Volume")).getByText("kg")).toBeInTheDocument();
      expect(within(statCard("Lifetime · Horas")).getByText("1")).toBeInTheDocument();
      expect(within(statCard("Lifetime · Horas")).getByText("h")).toBeInTheDocument();
      expect(screen.getByText("Erro ao carregar streak")).toBeInTheDocument();
    });

    it("conquista de streak mostra erro, conquistas de treinos mostram progresso real", () => {
      render(<PerfilPage />);
      expect(screen.getByText("Erro ao carregar")).toBeInTheDocument();
      expect(screen.getByText("1/10")).toBeInTheDocument();
      expect(screen.getByText("Conquistado")).toBeInTheDocument(); // "Primeiro treino"
    });
  });

  describe("formatVolume", () => {
    it("formata volumes abaixo de 1000 como número puro", () => {
      mockWorkouts = [workout(500)];
      render(<PerfilPage />);
      expect(within(statCard("Lifetime · Volume")).getByText("500")).toBeInTheDocument();
    });

    it("formata volumes na casa dos milhões com sufixo 'M'", () => {
      mockWorkouts = [workout(1_500_000)];
      render(<PerfilPage />);
      expect(within(statCard("Lifetime · Volume")).getByText("1.5M")).toBeInTheDocument();
    });
  });

  describe("accordion das configurações", () => {
    it("linha 'Dados pessoais' começa fechada e abre ao clicar", () => {
      render(<PerfilPage />);
      expect(screen.queryByPlaceholderText("Seu nome")).not.toBeInTheDocument();

      fireEvent.click(screen.getByText("Dados pessoais"));
      expect(screen.getByPlaceholderText("Seu nome")).toBeInTheDocument();
    });

    it("clicar novamente na mesma linha fecha o accordion", () => {
      render(<PerfilPage />);
      fireEvent.click(screen.getByText("Dados pessoais"));
      fireEvent.click(screen.getByText("Dados pessoais"));
      expect(screen.queryByPlaceholderText("Seu nome")).not.toBeInTheDocument();
    });

    it("abrir uma linha diferente fecha a anterior (accordion exclusivo)", () => {
      render(<PerfilPage />);
      fireEvent.click(screen.getByText("Dados pessoais"));
      expect(screen.getByPlaceholderText("Seu nome")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Objetivos"));
      expect(screen.queryByPlaceholderText("Seu nome")).not.toBeInTheDocument();
      expect(screen.getByText("Objetivo principal")).toBeInTheDocument();
    });

    it("linha 'Unidades (kg / cm)' abre e mostra o seletor de sistema de medidas", () => {
      render(<PerfilPage />);
      fireEvent.click(screen.getByText("Unidades (kg / cm)"));
      expect(screen.getByText("Sistema de medidas")).toBeInTheDocument();
    });

    it("selecionar um objetivo diferente destaca o chip escolhido", () => {
      render(<PerfilPage />);
      fireEvent.click(screen.getByText("Dados pessoais")); // fecha por padrão
      fireEvent.click(screen.getByText("Objetivos"));

      const forca = screen.getByRole("button", { name: "Força" });
      const hipertrofia = screen.getByRole("button", { name: "Hipertrofia" });
      expect(hipertrofia).toHaveClass("chip-accent");

      fireEvent.click(forca);
      expect(forca).toHaveClass("chip-accent");
      expect(hipertrofia).not.toHaveClass("chip-accent");
    });
  });

  describe("salvar configurações", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("clicar em Salvar mostra 'Salvo!' e volta para 'Salvar' após 2s", () => {
      render(<PerfilPage />);
      fireEvent.click(screen.getByText("Dados pessoais"));
      fireEvent.click(screen.getByRole("button", { name: /Salvar/ }));

      expect(screen.getByRole("button", { name: /Salvo!/ })).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(2000));
      expect(screen.getByRole("button", { name: /^Salvar$/ })).toBeInTheDocument();
    });
  });

  describe("logout", () => {
    it("clicar em 'Sair da conta' chama logout", () => {
      mockProgress = ZERO_PROGRESS;
      render(<PerfilPage />);
      fireEvent.click(screen.getByText("Sair da conta"));
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });
});
