import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import AiGenPage from "@/app/(dashboard)/ai-gen/page";
import type { GeneratedWorkout } from "@/app/api/generate-workout/route";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
import { api } from "@/lib/api";
const mockApi = api as unknown as { post: ReturnType<typeof vi.fn> };

const WORKOUT: GeneratedWorkout = {
  name: "Treino A", code: "A", schedule: "seg,qua,sex", tags: [],
  exercises: [{ name: "Supino", muscle: "Peitoral", restSeconds: 90, sets: [{ reps: 10, weight: 20, done: false, prev: 0 }] }],
};

const ANSWERS = ["Iniciante", "Hipertrofia", "3 dias", "Apenas peso corporal", "30 min"];

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

// getByRole por label de chip só é seguro porque o JSX esconde o conjunto de
// chips anterior assim que a próxima pergunta é anexada (i === messages.length
// - 1). Se essa condição mudar (ex: permitir editar respostas antigas), estes
// testes passam a colidir com "multiple elements found" em vez de falhar de
// forma clara — ver page.tsx linha ~168.
async function answerAllQuestions() {
  for (const label of ANSWERS) {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: label }));
    });
  }
}

describe("AiGenPage", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockApi.post.mockClear();
    mockApi.post.mockResolvedValue({});
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe("fluxo do wizard", () => {
    it("mostra a pergunta inicial de nível com os 3 chips", () => {
      render(<AiGenPage />);
      expect(screen.getByText(/Qual é seu nível/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Iniciante" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Avançado" })).toBeInTheDocument();
    });

    it("escolher um chip avança para a próxima pergunta e ecoa a resposta como mensagem do usuário", async () => {
      render(<AiGenPage />);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Iniciante" }));
      });

      expect(screen.getByText("Iniciante")).toBeInTheDocument();
      expect(screen.getByText(/qual seu objetivo principal/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Hipertrofia" })).toBeInTheDocument();
    });

    it("percorre as 4 primeiras perguntas em sequência (nível → objetivo → dias → equipamento)", async () => {
      render(<AiGenPage />);

      await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Iniciante" })); });
      expect(screen.getByText(/qual seu objetivo principal/)).toBeInTheDocument();

      await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Hipertrofia" })); });
      expect(screen.getByText(/Quantos dias por semana/)).toBeInTheDocument();

      await act(async () => { fireEvent.click(screen.getByRole("button", { name: "3 dias" })); });
      expect(screen.getByText(/Tem acesso a equipamentos/)).toBeInTheDocument();

      await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Apenas peso corporal" })); });
      expect(screen.getByText(/Quanto tempo por sessão/)).toBeInTheDocument();
    });

    it("esconde os chips da última pergunta assim que a geração começa (evita duplo envio)", async () => {
      vi.mocked(fetch).mockReturnValue(new Promise(() => {})); // nunca resolve
      render(<AiGenPage />);
      for (const label of ANSWERS.slice(0, 4)) {
        await act(async () => { fireEvent.click(screen.getByRole("button", { name: label })); });
      }

      await act(async () => { fireEvent.click(screen.getByRole("button", { name: "30 min" })); });

      expect(screen.queryByRole("button", { name: "30 min" })).not.toBeInTheDocument();
      expect(screen.getByText("Montando seu treino com IA...")).toBeInTheDocument();
    });
  });

  describe("chamada de geração", () => {
    it("ao responder a última pergunta, faz POST para /api/generate-workout com todas as respostas", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ workouts: [WORKOUT] }));
      render(<AiGenPage />);
      await answerAllQuestions();

      const call = vi.mocked(fetch).mock.calls[0];
      expect(call[0]).toBe("/api/generate-workout");
      expect(call[1]).toMatchObject({ method: "POST", headers: { "Content-Type": "application/json" } });
      // Compara o payload desserializado (não a string bruta) para não depender
      // da ordem de inserção das chaves em `newAnswers`.
      expect(JSON.parse(call[1]!.body as string)).toEqual({
        level: "Iniciante", goal: "Hipertrofia", days: "3 dias",
        equipment: "Apenas peso corporal", duration: "30 min",
      });
    });
  });

  describe("mensagens de loading rotativas", () => {
    // beforeEach/afterEach aninhados: o Vitest executa beforeEach de fora pra
    // dentro (stub do fetch já ativo quando useFakeTimers roda) e afterEach de
    // dentro pra fora (useRealTimers antes de restoreAllMocks/unstubAllGlobals),
    // então não há conflito de ordem entre o stub global e os fake timers.
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("mostra a mensagem inicial e avança a cada 1800ms, sem passar da última", async () => {
      let resolveFetch!: (r: Response) => void;
      vi.mocked(fetch).mockReturnValue(new Promise(r => { resolveFetch = r; }));

      render(<AiGenPage />);
      for (const label of ANSWERS) {
        await act(async () => { fireEvent.click(screen.getByRole("button", { name: label })); });
      }

      expect(screen.getByText("Montando seu treino com IA...")).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(1800));
      expect(screen.getByText("Selecionando os melhores exercícios...")).toBeInTheDocument();

      // avança bem além das 5 mensagens (5 * 1800 = 9000) — deve travar na última, não estourar o array
      act(() => vi.advanceTimersByTime(1800 * 10));
      expect(screen.getByText("Finalizando os detalhes...")).toBeInTheDocument();

      await act(async () => { resolveFetch(jsonResponse({ workouts: [WORKOUT] })); });
    });

    it("reinicia a mensagem no início a cada nova tentativa de geração (após um erro)", async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: "Groq indisponível" }, false));
      render(<AiGenPage />);

      for (const label of ANSWERS) {
        await act(async () => { fireEvent.click(screen.getByRole("button", { name: label })); });
      }
      expect(screen.getByText("Groq indisponível")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));

      let resolveFetch!: (r: Response) => void;
      vi.mocked(fetch).mockReturnValue(new Promise(r => { resolveFetch = r; }));
      for (const label of ANSWERS) {
        await act(async () => { fireEvent.click(screen.getByRole("button", { name: label })); });
      }

      expect(screen.getByText("Montando seu treino com IA...")).toBeInTheDocument();
      await act(async () => { resolveFetch(jsonResponse({ workouts: [WORKOUT] })); });
    });
  });

  describe("estado de sucesso", () => {
    it("mostra o treino gerado e esconde o balão de loading", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ workouts: [WORKOUT] }));
      render(<AiGenPage />);
      await answerAllQuestions();

      expect(screen.getByText("1 treino gerado!")).toBeInTheDocument();
      expect(screen.getByText("A — Treino A")).toBeInTheDocument();
      expect(screen.queryByText("Montando seu treino com IA...")).not.toBeInTheDocument();
    });

    it("salva ao clicar em 'Salvar e ver treinos', chama api.post e navega", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ workouts: [WORKOUT] }));
      render(<AiGenPage />);
      await answerAllQuestions();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Salvar e ver treinos" }));
      });

      expect(mockApi.post).toHaveBeenCalledTimes(1);
      expect(mockApi.post).toHaveBeenCalledWith("/workouts", WORKOUT);
      expect(mockPush).toHaveBeenCalledWith("/treinos");
    });

    it("chama api.post uma vez para cada treino gerado, na ordem correta", async () => {
      const second: GeneratedWorkout = { ...WORKOUT, code: "B", name: "Treino B" };
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ workouts: [WORKOUT, second] }));
      render(<AiGenPage />);
      await answerAllQuestions();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Salvar e ver treinos" }));
      });

      expect(mockApi.post).toHaveBeenNthCalledWith(1, "/workouts", WORKOUT);
      expect(mockApi.post).toHaveBeenNthCalledWith(2, "/workouts", second);
    });

    it("desabilita 'Salvar' e 'Gerar outro' enquanto o salvamento está em andamento", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ workouts: [WORKOUT] }));
      let resolvePost!: () => void;
      mockApi.post.mockReturnValue(new Promise<void>(r => { resolvePost = r; }));

      render(<AiGenPage />);
      await answerAllQuestions();

      fireEvent.click(screen.getByRole("button", { name: "Salvar e ver treinos" }));

      expect(await screen.findByRole("button", { name: "Salvando..." })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Gerar outro/ })).toBeDisabled();

      await act(async () => { resolvePost(); });
    });

    it("'Gerar outro' volta ao wizard do zero", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ workouts: [WORKOUT] }));
      render(<AiGenPage />);
      await answerAllQuestions();

      fireEvent.click(screen.getByRole("button", { name: /Gerar outro/ }));

      expect(screen.getByText(/Qual é seu nível/)).toBeInTheDocument();
      expect(screen.queryByText("1 treino gerado!")).not.toBeInTheDocument();
    });
  });

  describe("estado de erro", () => {
    it("mostra a mensagem de erro da API quando a resposta não é ok, e esconde o balão de loading", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: "Chave da Groq ausente" }, false));
      render(<AiGenPage />);
      await answerAllQuestions();

      expect(screen.getByText("Chave da Groq ausente")).toBeInTheDocument();
      expect(screen.queryByText(/treino gerado/)).not.toBeInTheDocument();
      expect(screen.queryByText("Montando seu treino com IA...")).not.toBeInTheDocument();
    });

    it("mostra data.error mesmo quando a rejeição do fetch é uma instância de Error (TypeError de rede)", async () => {
      vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
      render(<AiGenPage />);
      await answerAllQuestions();

      expect(screen.getByText("Failed to fetch")).toBeInTheDocument();
    });

    it("mostra a mensagem genérica de fallback quando o valor rejeitado não é uma instância de Error", async () => {
      // Rejeição propositalmente não-Error, para exercitar o branch de fallback
      vi.mocked(fetch).mockRejectedValue("timeout string cru, não um Error");
      render(<AiGenPage />);
      await answerAllQuestions();

      expect(screen.getByText("Erro inesperado. Tente novamente.")).toBeInTheDocument();
    });

    it("documenta o comportamento quando a resposta de erro não é JSON válido (ex: página HTML de erro 502)", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: async () => { throw new SyntaxError("Unexpected token '<'"); },
      } as unknown as Response);
      render(<AiGenPage />);
      await answerAllQuestions();

      // res.json() lança antes do throw new Error(data.error ?? ...) ser alcançado,
      // então o usuário vê a mensagem crua do parse, não o fallback "Erro ao gerar treino."
      expect(screen.getByText("Unexpected token '<'")).toBeInTheDocument();
    });

    it("'Tentar novamente' reseta o wizard para a pergunta inicial", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: "Erro ao gerar treino." }, false));
      render(<AiGenPage />);
      await answerAllQuestions();

      fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));

      expect(screen.getByText(/Qual é seu nível/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Iniciante" })).toBeInTheDocument();
      expect(screen.queryByText("Erro ao gerar treino.")).not.toBeInTheDocument();
    });

    it("erro ao salvar treinos (Error) mostra a mensagem real e não navega", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ workouts: [WORKOUT] }));
      mockApi.post.mockRejectedValue(new Error("Falha específica do servidor."));
      render(<AiGenPage />);
      await answerAllQuestions();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Salvar e ver treinos" }));
      });

      expect(screen.getByText("Falha específica do servidor.")).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("erro ao salvar treinos (não-Error) mostra a mensagem de fallback e não navega", async () => {
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ workouts: [WORKOUT] }));
      // Rejeição propositalmente não-Error, para exercitar o branch de fallback
      mockApi.post.mockRejectedValue("string crua, não um Error");
      render(<AiGenPage />);
      await answerAllQuestions();

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Salvar e ver treinos" }));
      });

      expect(screen.getByText("Erro ao salvar treinos.")).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
