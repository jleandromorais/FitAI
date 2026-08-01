// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SignJWT } from "jose";
import { POST } from "@/app/api/generate-workout/route";
import { NextRequest } from "next/server";

const JWT_SECRET = "test-secret-key-with-at-least-32-chars!!";

async function signToken(email: string): Promise<string> {
  const key = new TextEncoder().encode(JWT_SECRET);
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}

function makeRequest(body: object, token?: string): NextRequest {
  return {
    json: () => Promise.resolve(body),
    cookies: {
      get: (name: string) => (name === "token" && token ? { value: token } : undefined),
    },
    headers: {
      get: () => null,
    },
  } as unknown as NextRequest;
}

function makeGroqResponse(text: string, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    text: () => Promise.resolve(text),
    json: () =>
      Promise.resolve({
        choices: [{ message: { content: text } }],
      }),
  });
}

// Formato compacto que a rota realmente pede à IA: setsCount/reps/weight em
// vez do array de sets repetidos — a rota expande isso antes de responder.
const RAW_WORKOUT_JSON = JSON.stringify({
  workouts: [
    {
      name: "Treino A — Peito",
      code: "A",
      schedule: "Seg, Qui",
      tags: ["Hipertrofia"],
      exercises: [
        { name: "Supino Reto", muscle: "Peitoral", restSeconds: 90, setsCount: 4, reps: 10, weight: 60 },
      ],
    },
  ],
});

const VALID_BODY = { level: "Iniciante", goal: "Hipertrofia", days: "3", equipment: "Academia", duration: "60min" };

describe("POST /api/generate-workout", () => {
  beforeEach(() => {
    vi.stubEnv("GROQ_API_KEY", "fake-key-123");
    vi.stubEnv("JWT_SECRET", JWT_SECRET);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("retorna 401 quando não há token", async () => {
    const req = makeRequest(VALID_BODY);
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("retorna 401 quando o token é inválido", async () => {
    const req = makeRequest(VALID_BODY, "token-invalido");
    const res = await POST(req);

    expect(res.status).toBe(401);
  });

  it("retorna 500 quando GROQ_API_KEY não está configurada", async () => {
    vi.stubEnv("GROQ_API_KEY", "");
    const token = await signToken("ana@test.com");

    const req = makeRequest(VALID_BODY, token);
    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain("GROQ_API_KEY");
  });

  it("expande setsCount/reps/weight em um array de sets antes de responder", async () => {
    global.fetch = makeGroqResponse(RAW_WORKOUT_JSON);
    const token = await signToken("ana@test.com");

    const req = makeRequest(VALID_BODY, token);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.workouts).toHaveLength(1);
    expect(body.workouts[0].name).toBe("Treino A — Peito");

    const exercise = body.workouts[0].exercises[0];
    expect(exercise.sets).toHaveLength(4);
    expect(exercise.sets[0]).toEqual({ reps: 10, weight: 60, done: false, prev: 0 });
    expect(exercise.sets[3]).toEqual({ reps: 10, weight: 60, done: false, prev: 0 });
    expect(exercise.setsCount).toBeUndefined();
  });

  it("limita setsCount fora do intervalo 1-6 (protege contra a IA devolver um valor absurdo)", async () => {
    const raw = JSON.stringify({
      workouts: [{
        name: "Treino A", code: "A", schedule: "Seg", tags: [],
        exercises: [{ name: "Supino", muscle: "Peitoral", restSeconds: 90, setsCount: 99, reps: 10, weight: 60 }],
      }],
    });
    global.fetch = makeGroqResponse(raw);
    const token = await signToken("ana@test.com");

    const req = makeRequest(VALID_BODY, token);
    const res = await POST(req);
    const body = await res.json();

    expect(body.workouts[0].exercises[0].sets).toHaveLength(6);
  });

  it("remove blocos ```json``` da resposta antes de parsear", async () => {
    const withMarkdown = "```json\n" + RAW_WORKOUT_JSON + "\n```";
    global.fetch = makeGroqResponse(withMarkdown);
    const token = await signToken("ana@test.com");

    const req = makeRequest(VALID_BODY, token);
    const res = await POST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.workouts).toHaveLength(1);
  });

  it("retorna 502 quando Groq retorna JSON inválido", async () => {
    global.fetch = makeGroqResponse("isso não é JSON");
    const token = await signToken("ana@test.com");

    const req = makeRequest(VALID_BODY, token);
    const res = await POST(req);

    expect(res.status).toBe(502);
  });

  it("retorna 502 quando a chamada ao Groq falha (não-ok)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: () => Promise.resolve("Service Unavailable"),
    });
    const token = await signToken("ana@test.com");

    const req = makeRequest({ level: "Avançado", goal: "Força", days: "5", equipment: "Academia", duration: "90min" }, token);
    const res = await POST(req);

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("Groq API error");
  });

  it("faz a requisição ao Groq com o prompt correto", async () => {
    global.fetch = makeGroqResponse(RAW_WORKOUT_JSON);
    const token = await signToken("ana@test.com");

    const req = makeRequest({ level: "Intermediário", goal: "Emagrecimento", days: "4", equipment: "Halteres", duration: "45min" }, token);
    await POST(req);

    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toContain("api.groq.com");

    const reqBody = JSON.parse(options.body);
    const promptText = reqBody.messages[0].content;
    expect(promptText).toContain("Intermediário");
    expect(promptText).toContain("Emagrecimento");
    expect(promptText).toContain("Halteres");
  });
});
