"use strict";

const promptBuilder = require("./promptBuilder");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Calls Groq to generate workouts for the given request params, mirroring
 * the logic that used to live in frontend/app/api/generate-workout/route.ts.
 *
 * @param {{level:string, goal:string, days:string, equipment:string, duration:string}} requestParams
 * @returns {Promise<Array>} expanded workouts (see promptBuilder.expandWorkouts)
 */
async function generateWorkouts(requestParams) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY não configurada.");
  }

  const prompt = promptBuilder.buildPrompt(requestParams);

  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 6000,
      reasoning_effort: "low",
    }),
    // Sem o teto de 10s do Vercel aqui — o worker é um processo de vida
    // longa, então relaxamos a margem em relação aos 9s da rota original.
    signal: AbortSignal.timeout(25000),
  });

  if (!res.ok) {
    const err = await res.text();
    // Não repassa o corpo bruto da resposta da Groq pra fora — pode conter
    // detalhe interno do provedor. Fica só no log do worker.
    console.error("Groq API error:", res.status, err);
    const error = new Error("Erro ao gerar treino: Groq API retornou status " + res.status);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "";
  const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  if (!clean) {
    throw new Error("IA retornou resposta vazia.");
  }

  const parsed = JSON.parse(clean);
  if (!Array.isArray(parsed?.workouts)) {
    throw new Error("IA retornou formato inesperado.");
  }

  return promptBuilder.expandWorkouts(parsed.workouts);
}

module.exports = { generateWorkouts };
