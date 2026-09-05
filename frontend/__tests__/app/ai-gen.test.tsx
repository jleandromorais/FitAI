import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import AiGenPage from "@/app/(dashboard)/ai-gen/page";
import type { GeneratedWorkout, WorkoutGenerationJob } from "@/lib/workout-generation-types";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// A geração agora é 100% via lib/api.ts (enqueue + polling contra o backend
// Java) — não há mais `fetch` cru nem rota Next.js envolvida.
vi.mock("@/lib/api", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));
import { api } from "@/lib/api";
const mockApi = api as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

// Mesma cadência de polling de app/(dashboard)/ai-gen/page.tsx (POLL_INTERVAL_MS).
const POLL_INTERVAL_MS = 2000;

const WORKOUT: GeneratedWorkout = {
  name: "Treino A", code: "A", schedule: "seg,qua,sex", tags: [],
  exercises: [{ name: "Supino", muscle: "Peitoral", restSeconds: 90, sets: [{ reps: 10, weight: 20, done: false, prev: 0 }] }],
};

const ANSWERS = ["Iniciante", "Hipertrofia", "3 dias", "Apenas peso corporal", "30 min"];
const EXPECTED_REQUEST = {
  level: "Iniciante", goal: "Hipertrofia", days: "3 dias",
  equipment: "Apenas peso corporal", duration: "30 min",
};

const PENDING_JOB: WorkoutGenerationJob = { id: 42, status: "PENDING" };
const DONE_JOB: WorkoutGenerationJob = { id: 42, status: "DONE", workouts: [WORKOUT] };

// getByRole por label de chip só é seguro porque o JSX esconde o conjunto de
// chips anterior assim que a próxima pergunta é anexada (i === messages.length
// - 1). Se essa condição mudar (ex: permitir editar respostas antigas), estes
// testes passam a colidir com "multiple elements found" em vez de falhar de
// forma clara — ver page.tsx.
async function answerAllQuestions() {
  for (const label of ANSWERS) {
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: label }));
    });
  }
}

// Avança N ciclos do polling real (2s cada). vi.advanceTimersByTimeAsync
// (diferente de advanceTimersByTime) flusha as microtasks entre cada tick do
// timer, o que é necessário aqui porque o callback do setInterval é async
// (faz `await api.get(...)` antes de atualizar o estado).
async function advancePolls(cycles = 1) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * cycles);
  });
}

describe("AiGenPage", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockPush.mockClear();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    mockApi.post.mockResolvedValue({ ...PENDING_JOB });
    mockApi.get.mockResolvedValue({ ...DONE_JOB });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
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
      mockApi.post.mockReturnValue(new Promise(() => {})); // enqueue nunca resolve
      render(<AiGenPage />);
      for (const label of ANSWERS.slice(0, 4)) {
        await act(async () => { fireEvent.click(screen.getByRole("button", { name: label })); });
      }

      await act(async () => { fireEvent.click(screen.getByRole("button", { name: "30 min" })); });

      expect(screen.queryByRole("button", { name: "30 min" })).not.toBeInTheDocument();
      expect(screen.getByText("Montando seu treino com IA...")).toBeInTheDocument();
    });
  });

  describe("enfileiramento do job", () => {
    it("ao responder a última pergunta, faz POST para /workout-generation-jobs com todas as respostas", async () => {
      render(<AiGenPage />);
      await answerAllQuestions();

      expect(mockApi.post).toHaveBeenCalledWith("/workout-generation-jobs", EXPECTED_REQUEST);
    });

    it("mostra o erro imediatamente quando o job já volta FAILED (ex: publish no Kafka falhou), sem pollar", async () => {
      mockApi.post.mockResolvedValue({ id: 7, status: "FAILED", errorMessage: "Fila indisponível no momento." });
      render(<AiGenPage />);
      await answerAllQuestions();

      expect(screen.getByText("Fila indisponível no momento.")).toBeInTheDocument();
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it("mostra a mensagem genérica de fallback quando o job volta FAILED sem errorMessage", async () => {
      mockApi.post.mockResolvedValue({ id: 7, status: "FAILED" });
      render(<AiGenPage />);
      await answerAllQuestions();

      expect(screen.getByText("Erro ao gerar treino. Tente novamente.")).toBeInTheDocument();
    });

    it("mostra a mensagem de erro quando o enqueue (POST) falha", async () => {
      mockApi.post.mockRejectedValue(new Error("Erro 401"));
      render(<AiGenPage />);
      await answerAllQuestions();

      expect(screen.getByText("Erro 401")).toBeInTheDocument();
    });
  });

  describe("polling do status do job", () => {
    it("faz polling a cada 2s em GET /workout-generation-jobs/{id} enquanto PENDING/PROCESSING", async () => {
      mockApi.get
        .mockResolvedValueOnce({ id: 42, status: "PENDING" })
        .mockResolvedValueOnce({ id: 42, status: "PROCESSING" })
        .mockResolvedValueOnce({ ...DONE_JOB });

      render(<AiGenPage />);
      await answerAllQuestions();
      // A mensagem cosmética do carrossel (1800ms) e o poll real (2000ms) têm
      // cadências diferentes e não têm relação — as asserções abaixo checam o
      // estado real (job ainda não terminou), não o texto do carrossel.
      expect(screen.queryByText("1 treino gerado!")).not.toBeInTheDocument();

      await advancePolls(1);
      expect(mockApi.get).toHaveBeenNthCalledWith(1, "/workout-generation-jobs/42");
      expect(screen.queryByText("1 treino gerado!")).not.toBeInTheDocument();

      await advancePolls(1);
      expect(mockApi.get).toHaveBeenNthCalledWith(2, "/workout-generation-jobs/42");
      expect(screen.queryByText("1 treino gerado!")).not.toBeInTheDocument();

      await advancePolls(1);
      expect(screen.getByText("1 treino gerado!")).toBeInTheDocument();
    });

    it("em DONE, popula os treinos gerados e para de pollar", async () => {
      render(<AiGenPage />);
      await answerAllQuestions();
      await advancePolls(1);

      expect(screen.getByText("1 treino gerado!")).toBeInTheDocument();
      expect(screen.getByText("A — Treino A")).toBeInTheDocument();
      expect(screen.queryByText("Montando seu treino com IA...")).not.toBeInTheDocument();

      const callsAfterDone = mockApi.get.mock.calls.length;
      await advancePolls(3);
      expect(mockApi.get.mock.calls.length).toBe(callsAfterDone);
    });

    it("em FAILED, mostra o erro do backend/worker (ex: cota da IA excedida) e para de pollar", async () => {
      mockApi.get.mockResolvedValue({ id: 42, status: "FAILED", errorMessage: "Cota diária da IA excedida, tente novamente mais tarde." });
      render(<AiGenPage />);
      await answerAllQuestions();
      await advancePolls(1);

      expect(screen.getByText("Cota diária da IA excedida, tente novamente mais tarde.")).toBeInTheDocument();
      expect(screen.queryByText("Montando seu treino com IA...")).not.toBeInTheDocument();
    });

    it("para de pollar e mostra timeout após ~60 tentativas (2 minutos) sem DONE/FAILED", async () => {
      mockApi.get.mockResolvedValue({ id: 42, status: "PROCESSING" });
      render(<AiGenPage />);
      await answerAllQuestions();

      await advancePolls(61);

      expect(screen.getByText("A geração está demorando mais que o esperado. Tente novamente.")).toBeInTheDocument();
      expect(screen.queryByText("Montando seu treino com IA...")).not.toBeInTheDocument();

      const callsAtTimeout = mockApi.get.mock.calls.length;
      expect(callsAtTimeout).toBe(60);

      await advancePolls(3);
      expect(mockApi.get.mock.calls.length).toBe(callsAtTimeout);
    });

    it("mostra erro e para de pollar se o GET falhar", async () => {
      mockApi.get.mockRejectedValue(new Error("Erro 500"));
      render(<AiGenPage />);
      await answerAllQuestions();
      await advancePolls(1);

      expect(screen.getByText("Erro 500")).toBeInTheDocument();
    });
  });

  describe("mensagens de loading rotativas", () => {
    // Puramente cosmético — independente do polling real. Mantém o job em
    // PROCESSING pela duração do teste pra não interferir na asserção.
    it("mostra a mensagem inicial e avança a cada 1800ms, sem passar da última", async () => {
      mockApi.get.mockResolvedValue({ id: 42, status: "PROCESSING" });
      render(<AiGenPage />);
      await answerAllQuestions();

      expect(screen.getByText("Montando seu treino com IA...")).toBeInTheDocument();

      await act(async () => { await vi.advanceTimersByTimeAsync(1800); });
      expect(screen.getByText("Selecionando os melhores exercícios...")).toBeInTheDocument();

      // avança bem além das 5 mensagens (5 * 1800 = 9000) — deve travar na última, não estourar o array
      await act(async () => { await vi.advanceTimersByTimeAsync(1800 * 10); });
      expect(screen.getByText("Finalizando os detalhes...")).toBeInTheDocument();
    });

    it("reinicia a mensagem no início a cada nova tentativa de geração (após um erro)", async () => {
      mockApi.post.mockResolvedValueOnce({ id: 1, status: "FAILED", errorMessage: "Fila indisponível." });
      render(<AiGenPage />);
      await answerAllQuestions();
      expect(screen.getByText("Fila indisponível.")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));

      mockApi.post.mockResolvedValueOnce({ ...PENDING_JOB });
      mockApi.get.mockResolvedValue({ id: 42, status: "PROCESSING" });
      await answerAllQuestions();

      expect(screen.getByText("Montando seu treino com IA...")).toBeInTheDocument();
    });
  });

  describe("estado de sucesso", () => {
    async function generateAndFinish() {
      render(<AiGenPage />);
      await answerAllQuestions();
      await advancePolls(1);
    }

    it("mostra o treino gerado e esconde o balão de loading", async () => {
      await generateAndFinish();

      expect(screen.getByText("1 treino gerado!")).toBeInTheDocument();
      expect(screen.getByText("A — Treino A")).toBeInTheDocument();
      expect(screen.queryByText("Montando seu treino com IA...")).not.toBeInTheDocument();
    });

    it("salva ao clicar em 'Salvar e ver treinos', chama api.post e navega", async () => {
      await generateAndFinish();
      mockApi.post.mockClear();
      mockApi.post.mockResolvedValue({});

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Salvar e ver treinos" }));
      });

      expect(mockApi.post).toHaveBeenCalledTimes(1);
      expect(mockApi.post).toHaveBeenCalledWith("/workouts", WORKOUT);
      expect(mockPush).toHaveBeenCalledWith("/treinos");
    });

    it("chama api.post uma vez para cada treino gerado, na ordem correta", async () => {
      const second: GeneratedWorkout = { ...WORKOUT, code: "B", name: "Treino B" };
      mockApi.get.mockResolvedValue({ id: 42, status: "DONE", workouts: [WORKOUT, second] });
      await generateAndFinish();
      mockApi.post.mockClear();
      mockApi.post.mockResolvedValue({});

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Salvar e ver treinos" }));
      });

      expect(mockApi.post).toHaveBeenNthCalledWith(1, "/workouts", WORKOUT);
      expect(mockApi.post).toHaveBeenNthCalledWith(2, "/workouts", second);
    });

    it("desabilita 'Salvar' e 'Gerar outro' enquanto o salvamento está em andamento", async () => {
      await generateAndFinish();
      let resolvePost!: () => void;
      mockApi.post.mockReturnValue(new Promise<void>(r => { resolvePost = r; }));

      // fireEvent.click aqui precisa estar dentro de act(async...) em vez de
      // usar screen.findByRole (waitFor) logo abaixo: com fake timers ativos,
      // o polling interno do waitFor nunca avança (não é orientado a timers
      // reais) e o teste trava até o timeout do runner.
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Salvar e ver treinos" }));
      });

      expect(screen.getByRole("button", { name: "Salvando..." })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Gerar outro/ })).toBeDisabled();

      await act(async () => { resolvePost(); });
    });

    it("'Gerar outro' volta ao wizard do zero", async () => {
      await generateAndFinish();

      fireEvent.click(screen.getByRole("button", { name: /Gerar outro/ }));

      expect(screen.getByText(/Qual é seu nível/)).toBeInTheDocument();
      expect(screen.queryByText("1 treino gerado!")).not.toBeInTheDocument();
    });
  });

  describe("estado de erro", () => {
    it("mostra a mensagem de erro do job quando o status final é FAILED, e esconde o balão de loading", async () => {
      mockApi.get.mockResolvedValue({ id: 42, status: "FAILED", errorMessage: "Chave da IA ausente no worker." });
      render(<AiGenPage />);
      await answerAllQuestions();
      await advancePolls(1);

      expect(screen.getByText("Chave da IA ausente no worker.")).toBeInTheDocument();
      expect(screen.queryByText(/treino gerado/)).not.toBeInTheDocument();
      expect(screen.queryByText("Montando seu treino com IA...")).not.toBeInTheDocument();
    });

    it("mostra a mensagem do Error quando o enqueue (POST) rejeita com uma instância de Error", async () => {
      mockApi.post.mockRejectedValue(new Error("Failed to fetch"));
      render(<AiGenPage />);
      await answerAllQuestions();

      expect(screen.getByText("Failed to fetch")).toBeInTheDocument();
    });

    it("mostra a mensagem genérica de fallback quando o valor rejeitado no enqueue não é uma instância de Error", async () => {
      // Rejeição propositalmente não-Error, para exercitar o branch de fallback
      mockApi.post.mockRejectedValue("timeout string cru, não um Error");
      render(<AiGenPage />);
      await answerAllQuestions();

      expect(screen.getByText("Erro inesperado. Tente novamente.")).toBeInTheDocument();
    });

    it("'Tentar novamente' reseta o wizard para a pergunta inicial", async () => {
      mockApi.post.mockResolvedValue({ id: 1, status: "FAILED", errorMessage: "Erro ao gerar treino." });
      render(<AiGenPage />);
      await answerAllQuestions();

      fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));

      expect(screen.getByText(/Qual é seu nível/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Iniciante" })).toBeInTheDocument();
      expect(screen.queryByText("Erro ao gerar treino.")).not.toBeInTheDocument();
    });

    it("erro ao salvar treinos (Error) mostra a mensagem real e não navega", async () => {
      render(<AiGenPage />);
      await answerAllQuestions();
      await advancePolls(1);

      mockApi.post.mockRejectedValue(new Error("Falha específica do servidor."));

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Salvar e ver treinos" }));
      });

      expect(screen.getByText("Falha específica do servidor.")).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("erro ao salvar treinos (não-Error) mostra a mensagem de fallback e não navega", async () => {
      render(<AiGenPage />);
      await answerAllQuestions();
      await advancePolls(1);

      // Rejeição propositalmente não-Error, para exercitar o branch de fallback
      mockApi.post.mockRejectedValue("string crua, não um Error");

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Salvar e ver treinos" }));
      });

      expect(screen.getByText("Erro ao salvar treinos.")).toBeInTheDocument();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});
