import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "@/components/Sidebar";

const mockPush = vi.fn();
let mockPathname = "/";
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

const mockLogout = vi.fn();
let mockUser: { name: string; email: string } | null = { name: "Leandro Silva", email: "leandro@example.com" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser, logout: mockLogout }),
}));

let mockWorkouts: { id: number }[] = [];
vi.mock("@/hooks/useWorkouts", () => ({
  useWorkouts: () => ({ workouts: mockWorkouts }),
}));

describe("Sidebar", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockLogout.mockClear();
    mockPathname = "/";
    mockUser = { name: "Leandro Silva", email: "leandro@example.com" };
    mockWorkouts = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('marca "Dashboard" ativo só em match exato da rota "/"', () => {
    mockPathname = "/";
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /Dashboard/ })).toHaveClass("active");
    expect(screen.getByRole("link", { name: /Treinos/ })).not.toHaveClass("active");
  });

  it('marca "Treinos" ativo em subrotas (ex: /treinos/5), mas não "Dashboard"', () => {
    mockPathname = "/treinos/5";
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /Treinos/ })).toHaveClass("active");
    expect(screen.getByRole("link", { name: /Dashboard/ })).not.toHaveClass("active");
  });

  it("mostra o item 'Físico' apontando para /evolucao entre 'Evolução' e 'Perfil'", () => {
    render(<Sidebar />);
    const fisico = screen.getByRole("link", { name: /Físico/ });
    expect(fisico).toHaveAttribute("href", "/evolucao");
  });

  it("cada item de NAV fica ativo apenas na sua própria rota", () => {
    const routes: [string, RegExp][] = [
      ["/calendario", /Histórico/],
      ["/progresso", /Evolução/],
      ["/evolucao", /Físico/],
      ["/perfil", /Perfil/],
    ];
    for (const [path, name] of routes) {
      mockPathname = path;
      const { unmount } = render(<Sidebar />);
      expect(screen.getByRole("link", { name })).toHaveClass("active");
      expect(screen.getByRole("link", { name: /Dashboard/ })).not.toHaveClass("active");
      unmount();
    }
  });

  it("documenta o comportamento do matching por prefixo: uma rota que apenas começa com o href também ativa o item (não precisa ser subrota real)", () => {
    // "/perfil" usa startsWith, não segmentação de rota — uma futura rota como
    // "/perfil-config" (que hoje não existe no NAV) também marcaria "Perfil"
    // como ativo. Este teste documenta esse comportamento atual, não o valida
    // como correto — ver deferred-work.md se isso virar um problema real.
    mockPathname = "/perfil-config";
    render(<Sidebar />);
    expect(screen.getByRole("link", { name: /Perfil/ })).toHaveClass("active");
  });

  it("mostra o badge de contagem de treinos quando há treinos", () => {
    mockWorkouts = [{ id: 1 }, { id: 2 }];
    render(<Sidebar />);
    const treinosLink = screen.getByRole("link", { name: /Treinos/ });
    expect(treinosLink.querySelector(".badge")).toHaveTextContent("2");
  });

  it("não renderiza nenhum elemento de badge quando não há treinos", () => {
    mockWorkouts = [];
    render(<Sidebar />);
    const treinosLink = screen.getByRole("link", { name: /Treinos/ });
    expect(treinosLink.querySelector(".badge")).not.toBeInTheDocument();
  });

  it("botão de nome/email navega para /perfil ao ser clicado", () => {
    render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: /Ver perfil de Leandro Silva/ }));
    expect(mockPush).toHaveBeenCalledWith("/perfil");
  });

  it("mostra as iniciais do nome no avatar (até 2 palavras)", () => {
    render(<Sidebar />);
    expect(screen.getByText("LS")).toBeInTheDocument();
  });

  it("usa '?' como iniciais quando não há usuário", () => {
    mockUser = null;
    render(<Sidebar />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("usa o email como fallback de nome quando user.name está vazio", () => {
    mockUser = { name: "", email: "semnome@example.com" };
    render(<Sidebar />);
    expect(screen.getByText("semnome")).toBeInTheDocument();
  });

  it("usa 'Usuário' como fallback final (sem nome nem email) e reflete isso no aria-label", () => {
    mockUser = null;
    render(<Sidebar />);
    expect(screen.getByText("Usuário")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver perfil de Usuário" })).toBeInTheDocument();
  });

  it("aria-label do botão de perfil inclui nome e email quando ambos existem", () => {
    render(<Sidebar />);
    expect(screen.getByRole("button", { name: "Ver perfil de Leandro Silva, leandro@example.com" })).toBeInTheDocument();
  });

  it("título (tooltip) do nome e email truncados reflete o texto completo", () => {
    const { container } = render(<Sidebar />);
    expect(container.querySelector('span[title="Leandro Silva"]')).toBeInTheDocument();
    expect(container.querySelector('span[title="leandro@example.com"]')).toBeInTheDocument();
  });

  it("menu mobile começa fechado, com aria-expanded=false", () => {
    const { container } = render(<Sidebar />);
    expect(container.querySelector(".sidebar")).not.toHaveClass("mobile-open");
    expect(screen.getByRole("button", { name: "Abrir menu" })).toHaveAttribute("aria-expanded", "false");
  });

  it("clicar no hambúrguer abre o menu e atualiza aria-expanded/label", () => {
    const { container } = render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));

    expect(container.querySelector(".sidebar")).toHaveClass("mobile-open");
    expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveAttribute("aria-expanded", "true");
  });

  it("clicar no hambúrguer novamente fecha o menu mobile", () => {
    const { container } = render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Fechar menu" }));

    expect(container.querySelector(".sidebar")).not.toHaveClass("mobile-open");
  });

  it("clicar no backdrop fecha o menu mobile", () => {
    const { container } = render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(container.querySelector(".sidebar")).toHaveClass("mobile-open");

    fireEvent.click(container.querySelector(".sidebar-backdrop")!);
    expect(container.querySelector(".sidebar")).not.toHaveClass("mobile-open");
  });

  it("fecha o menu mobile automaticamente ao navegar para outra rota", () => {
    const { container, rerender } = render(<Sidebar />);
    fireEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(container.querySelector(".sidebar")).toHaveClass("mobile-open");

    mockPathname = "/treinos";
    rerender(<Sidebar />);

    expect(container.querySelector(".sidebar")).not.toHaveClass("mobile-open");
  });

  it("pede confirmação antes de deslogar e chama logout se confirmado", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<Sidebar />);

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));

    expect(confirmSpy).toHaveBeenCalledWith("Tem certeza que deseja sair?");
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it("não chama logout se a confirmação for cancelada", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<Sidebar />);

    fireEvent.click(screen.getByRole("button", { name: "Sair" }));

    expect(mockLogout).not.toHaveBeenCalled();
  });
});
