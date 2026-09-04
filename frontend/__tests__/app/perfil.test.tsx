import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, within, act } from "@testing-library/react";
import PerfilPage from "@/app/(dashboard)/perfil/page";
import { LanguageProvider } from "@/contexts/LanguageContext";
import type { Workout } from "@/hooks/useWorkouts";
import type { ProgressData } from "@/hooks/useProgress";

const mockLogout = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { name: "Leandro Silva", email: "leandro@example.com" }, logout: mockLogout }),
}));

const mockReloadWorkouts = vi.fn();
let mockWorkouts: Workout[] = [];
let mockWorkoutsLoading = false;
let mockWorkoutsError: string | null = null;
vi.mock("@/hooks/useWorkouts", () => ({
  useWorkouts: () => ({ workouts: mockWorkouts, loading: mockWorkoutsLoading, error: mockWorkoutsError, reload: mockReloadWorkouts }),
}));

// data começa/segue null até o primeiro fetch bem-sucedido — mesmo contrato de
// frontend/hooks/useProgress.ts (useState<ProgressData | null>(null)), não um
// valor "zerado" fabricado, para não mascarar a null-safety de `progress?.currentStreak ?? 0`.
const mockReloadProgress = vi.fn();
let mockProgress: ProgressData | null = null;
let mockProgressLoading = false;
let mockProgressError: string | null = null;
vi.mock("@/hooks/useProgress", () => ({
  useProgress: () => ({ data: mockProgress, loading: mockProgressLoading, error: mockProgressError, reload: mockReloadProgress }),
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

// Escopa ao card de Conquistas: o card também contém o chip de streak no
// header do perfil, que tem o mesmo texto "N dias streak" quando streak = 0.
function conquistasCard() {
  return screen.getByText("Conquistas").closest(".card") as HTMLElement;
}

describe("PerfilPage", () => {
  beforeEach(() => {
    mockLogout.mockClear();
    mockReloadWorkouts.mockClear();
    mockReloadProgress.mockClear();
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

    it("mostra '0 dias streak' no chip (sem ícone de chama, streak zerado) e '—' nos 3 stats de Lifetime", () => {
      const { container } = render(<PerfilPage />);
      const chip = container.querySelector(".chip-accent")!;
      expect(chip).toHaveTextContent("0 dias streak");
      expect(chip.querySelector(".flame-icon")).not.toBeInTheDocument();
      expect(within(statCard("Lifetime · Treinos")).getByText("—")).toBeInTheDocument();
      expect(within(statCard("Lifetime · Volume")).getByText("—")).toBeInTheDocument();
      expect(within(statCard("Lifetime · Horas")).getByText("—")).toBeInTheDocument();
    });

    it("mostra 'Comece hoje' e '0/10' nas conquistas, com o número real no título (não fabricado)", () => {
      render(<PerfilPage />);
      const card = conquistasCard();
      expect(within(card).getByText("Comece hoje")).toBeInTheDocument();
      expect(within(card).getByText("0/10")).toBeInTheDocument();
      expect(within(card).getByText("0 dias streak")).toBeInTheDocument();
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

  describe("retry no estado de erro", () => {
    it("não mostra o banner de retry quando não há erro", () => {
      mockProgress = ZERO_PROGRESS;
      render(<PerfilPage />);
      expect(screen.queryByText("Algumas informações não puderam ser carregadas.")).not.toBeInTheDocument();
    });

    it("não mostra o banner de retry durante o loading (sem erro ainda)", () => {
      mockWorkoutsLoading = true;
      mockProgressLoading = true;
      render(<PerfilPage />);
      expect(screen.queryByText("Algumas informações não puderam ser carregadas.")).not.toBeInTheDocument();
    });

    it("mostra o banner quando só workouts falha, e retry chama apenas reload de workouts", () => {
      mockWorkoutsError = "Erro de rede";
      render(<PerfilPage />);

      expect(screen.getByText("Algumas informações não puderam ser carregadas.")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));

      expect(mockReloadWorkouts).toHaveBeenCalledTimes(1);
      expect(mockReloadProgress).not.toHaveBeenCalled();
    });

    it("mostra o banner quando só progress falha, e retry chama apenas reload de progress", () => {
      mockProgressError = "Erro de rede";
      render(<PerfilPage />);

      fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));

      expect(mockReloadProgress).toHaveBeenCalledTimes(1);
      expect(mockReloadWorkouts).not.toHaveBeenCalled();
    });

    it("quando os dois hooks falham, retry chama os dois reloads", () => {
      mockWorkoutsError = "Erro de rede";
      mockProgressError = "Erro de rede";
      render(<PerfilPage />);

      fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));

      expect(mockReloadWorkouts).toHaveBeenCalledTimes(1);
      expect(mockReloadProgress).toHaveBeenCalledTimes(1);
    });

    it("mantém o banner visível com botão desabilitado 'Tentando…' enquanto o retry está em andamento (reload() já limpou o error, mas ainda está loading)", () => {
      mockWorkoutsError = "Erro de rede";
      const { rerender } = render(<PerfilPage />);

      fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));

      // simula o que reload() de fato faz: limpa error, liga loading, antes do fetch resolver
      mockWorkoutsError = null;
      mockWorkoutsLoading = true;
      rerender(<PerfilPage />);

      expect(screen.getByText("Algumas informações não puderam ser carregadas.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Tentando/ })).toBeDisabled();
    });

    it("esconde o banner depois que o retry tem sucesso", () => {
      mockWorkoutsError = "Erro de rede";
      const { rerender } = render(<PerfilPage />);

      fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));
      mockWorkoutsError = null;
      mockWorkoutsLoading = true;
      rerender(<PerfilPage />);
      expect(screen.getByText("Algumas informações não puderam ser carregadas.")).toBeInTheDocument();

      mockWorkoutsLoading = false; // sucesso: error já ficou null desde o início do reload
      rerender(<PerfilPage />);

      expect(screen.queryByText("Algumas informações não puderam ser carregadas.")).not.toBeInTheDocument();
    });

    it("falha parcial: se só um dos dois se recupera, o banner permanece e um novo clique só re-tenta o que ainda falha", () => {
      mockWorkoutsError = "Erro de rede";
      mockProgressError = "Erro de rede";
      const { rerender } = render(<PerfilPage />);

      fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));
      expect(mockReloadWorkouts).toHaveBeenCalledTimes(1);
      expect(mockReloadProgress).toHaveBeenCalledTimes(1);

      // simula reload() começando pros dois
      mockWorkoutsError = null;
      mockProgressError = null;
      mockWorkoutsLoading = true;
      mockProgressLoading = true;
      rerender(<PerfilPage />);

      // resultado: workouts se recupera, progress falha de novo
      mockWorkoutsLoading = false;
      mockProgressLoading = false;
      mockProgressError = "Erro de rede (de novo)";
      rerender(<PerfilPage />);

      expect(screen.getByText("Algumas informações não puderam ser carregadas.")).toBeInTheDocument();
      const retryBtn = screen.getByRole("button", { name: "Tentar novamente" });
      expect(retryBtn).not.toBeDisabled();

      fireEvent.click(retryBtn);
      expect(mockReloadWorkouts).toHaveBeenCalledTimes(1); // não de novo — já recuperado
      expect(mockReloadProgress).toHaveBeenCalledTimes(2); // de novo — ainda em erro
    });
  });

  describe("seletor de idioma", () => {
    // Render sem <LanguageProvider> usa o default do contexto (setLocale
    // no-op), então esses testes precisam do provider real para exercitar a
    // troca de fato — é o que valida que o seletor funciona de ponta a ponta.
    afterEach(() => {
      localStorage.clear();
    });

    it("começa com o chip PT ativo e os textos em português", () => {
      mockProgress = ZERO_PROGRESS;
      render(<LanguageProvider><PerfilPage /></LanguageProvider>);

      expect(screen.getByRole("button", { name: "PT" })).toHaveClass("chip-accent");
      expect(screen.getByRole("button", { name: "EN" })).not.toHaveClass("chip-accent");
      expect(screen.getByText("Sair da conta")).toBeInTheDocument();
    });

    it("clicar em EN troca os textos da página, ativa o chip EN e persiste no localStorage", () => {
      mockProgress = ZERO_PROGRESS;
      render(<LanguageProvider><PerfilPage /></LanguageProvider>);

      fireEvent.click(screen.getByRole("button", { name: "EN" }));

      expect(screen.getByRole("button", { name: "EN" })).toHaveClass("chip-accent");
      expect(screen.getByRole("button", { name: "PT" })).not.toHaveClass("chip-accent");
      expect(screen.getByText("Sign out")).toBeInTheDocument();
      expect(screen.queryByText("Sair da conta")).not.toBeInTheDocument();
      expect(localStorage.getItem("locale")).toBe("en");
    });

    it("lê o idioma salvo no localStorage ao montar (persistência entre sessões)", () => {
      localStorage.setItem("locale", "en");
      mockProgress = ZERO_PROGRESS;
      render(<LanguageProvider><PerfilPage /></LanguageProvider>);

      expect(screen.getByRole("button", { name: "EN" })).toHaveClass("chip-accent");
      expect(screen.getByText("Sign out")).toBeInTheDocument();
    });
  });

  describe("compartilhar", () => {
    afterEach(() => {
      // @ts-expect-error -- limpando stub de teste, propriedade normalmente ausente no jsdom
      delete navigator.share;
      // @ts-expect-error -- limpando stub de teste, propriedade normalmente ausente no jsdom
      delete navigator.clipboard;
    });

    it("usa a Web Share API quando disponível, sem cair no fallback de clipboard", async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "share", { value: shareMock, configurable: true });
      const writeTextMock = vi.fn();
      Object.defineProperty(navigator, "clipboard", { value: { writeText: writeTextMock }, configurable: true });
      mockProgress = ZERO_PROGRESS;

      render(<PerfilPage />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Compartilhar/ }));
      });

      expect(shareMock).toHaveBeenCalledWith(expect.objectContaining({ title: "FitAI" }));
      expect(writeTextMock).not.toHaveBeenCalled();
      expect(screen.getByRole("button", { name: /Compartilhar/ })).toBeInTheDocument();
    });

    it("cai no fallback de clipboard quando a Web Share API não existe, mostrando 'Link copiado!' por 2s", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", { value: { writeText: writeTextMock }, configurable: true });
      mockProgress = ZERO_PROGRESS;
      vi.useFakeTimers();

      render(<PerfilPage />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /Compartilhar/ }));
      });

      expect(writeTextMock).toHaveBeenCalledWith(window.location.origin);
      expect(screen.getByRole("button", { name: "Link copiado!" })).toBeInTheDocument();

      await act(async () => { vi.advanceTimersByTime(2000); });
      expect(screen.getByRole("button", { name: "Compartilhar" })).toBeInTheDocument();

      vi.useRealTimers();
    });
  });
});
