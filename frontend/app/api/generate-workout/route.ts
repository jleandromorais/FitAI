import { NextRequest, NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth-jwt";

export interface GenerateRequest {
  level: string;
  goal: string;
  days: string;
  equipment: string;
  duration: string;
}

export interface GeneratedWorkout {
  name: string;
  code: string;
  schedule: string;
  tags: string[];
  exercises: {
    name: string;
    muscle: string;
    restSeconds: number;
    sets: { reps: number; weight: number; done: boolean; prev: number }[];
  }[];
}

export interface GenerateResponse {
  workouts: GeneratedWorkout[];
}

// Dias fora de 3-6 não têm um split definido em getSplit() — cai no default
// "adaptado para N dias", e N cru (incluindo NaN) vaza pro prompt da IA
function parseValidDays(days: string): number {
  const n = parseInt(days, 10);
  return Number.isInteger(n) && n >= 3 && n <= 6 ? n : 3;
}

function getSplit(days: string, goal: string, level: string): string {
  const n = parseValidDays(days);
  const isStrength = goal === "Força";
  const isFat = goal === "Emagrecimento";

  if (n <= 3) return `SPLIT: Full Body (3x/semana)
- Treino A, B e C são Full Body completos com variações de exercícios
- Cada sessão: 1 exercício composto por grupo muscular principal (Peito, Costas, Pernas, Ombros)
- Foco: movimentos compostos multiarticulares (agachamento, supino, remada, desenvolvimento)
- Descanso entre treinos: pelo menos 1 dia`;

  if (n === 4) return `SPLIT: Upper / Lower (4x/semana)
- Treino A: Upper A — Peito e Costas (empurrar + puxar horizontal)
- Treino B: Lower A — Quadríceps e Glúteos (agachamento dominante)
- Treino C: Upper B — Ombros, Bíceps e Tríceps (empurrar + puxar vertical)
- Treino D: Lower B — Posterior de coxa e Panturrilha (quadril dominante)
- Sugestão de dias: Seg/Ter/Qui/Sex com Qua e fim de semana livres`;

  if (n === 5) return `SPLIT: Push / Pull / Legs + Upper / Lower (5x/semana)
- Treino A: Push — Peito, Ombros e Tríceps
- Treino B: Pull — Costas e Bíceps
- Treino C: Legs — Pernas completas (Quad, Posterior, Glúteos, Panturrilha)
- Treino D: Upper — Peito e Costas (volume moderado)
- Treino E: Lower — Pernas completas (variação)
- Sugestão de dias: Seg/Ter/Qua/Qui/Sex`;

  if (n === 6) return `SPLIT: PPL Duplo — Push Pull Legs 2x (6x/semana)
- Treino A: Push A — Peito (foco) + Ombros + Tríceps
- Treino B: Pull A — Costas (foco) + Bíceps
- Treino C: Legs A — Quad e Glúteos (agachamento dominante)
- Treino D: Push B — Ombros (foco) + Peito + Tríceps
- Treino E: Pull B — Costas (largura) + Bíceps
- Treino F: Legs B — Posterior de coxa e Panturrilha
- Sugestão de dias: Seg a Sáb com Dom livre`;

  return `SPLIT: ABC (3 dias) adaptado para ${n} dias com rotação`;
}

function getRepScheme(goal: string, level: string): string {
  if (goal === "Força") return "3-5 séries de 3-6 reps com cargas altas (85-95% do max), descanso 3-5 min";
  if (goal === "Hipertrofia") return "3-4 séries de 8-12 reps com carga moderada-alta (70-80% do max), descanso 60-90s";
  if (goal === "Resistência") return "3-4 séries de 15-20 reps com carga moderada (50-65% do max), descanso 30-45s";
  if (goal === "Emagrecimento") return "3-4 séries de 12-15 reps com pouco descanso (30-45s), foco em circuito";
  return "3-4 séries de 8-12 reps, descanso 60-90s";
}

function buildPrompt(req: GenerateRequest): string {
  const split = getSplit(req.days, req.goal, req.level);
  const repScheme = getRepScheme(req.goal, req.level);
  const n = parseValidDays(req.days);

  return `Você é um personal trainer com certificação NSCA e 10 anos de experiência em academias. Crie um plano de treino profissional em JSON.

PERFIL DO ALUNO:
- Nível: ${req.level}
- Objetivo: ${req.goal}
- Dias disponíveis: ${req.days} (${n} treinos)
- Equipamentos: ${req.equipment}
- Duração por sessão: ${req.duration}

${split}

ESQUEMA DE SÉRIES E REPS:
${repScheme}

REGRAS DE EXERCÍCIOS:
- Iniciante: exercícios básicos (supino reto, agachamento livre, remada curvada, desenvolvimento)
- Intermediário: variações (supino inclinado, leg press, remada unilateral, elevação lateral)
- Avançado: exercícios compostos avançados + isolamento (crucifixo cabos, hack squat, remada Yates, face pull)
- Sempre iniciar com exercícios compostos e terminar com isolamento
- Ajustar pesos: Iniciante 40-60% do máximo estimado, Intermediário 65-75%, Avançado 75-85%
- Peso corporal: se equipamento for "Apenas peso corporal", use weight: 0 e adapte com flexão, barra, etc.

Retorne APENAS um JSON válido, sem markdown, sem texto fora do JSON:
{
  "workouts": [
    {
      "name": "Treino A — Push (Peito, Ombros e Tríceps)",
      "code": "A",
      "schedule": "Seg, Qui",
      "tags": ["Hipertrofia", "Push"],
      "exercises": [
        {
          "name": "Supino Reto com Barra",
          "muscle": "Peitoral",
          "restSeconds": 90,
          "sets": [
            { "reps": 10, "weight": 60, "done": false, "prev": 0 },
            { "reps": 10, "weight": 60, "done": false, "prev": 0 },
            { "reps": 10, "weight": 60, "done": false, "prev": 0 },
            { "reps": 10, "weight": 60, "done": false, "prev": 0 }
          ]
        }
      ]
    }
  ]
}

IMPORTANTE:
- Crie EXATAMENTE ${n} treinos no array workouts
- Cada treino: 5-7 exercícios (${req.duration === "30 min" ? "4-5" : req.duration === "45 min" ? "5-6" : "6-7"} para ${req.duration})
- Os músculos devem ser APENAS: Peitoral, Costas, Ombros, Bíceps, Tríceps, Pernas, Glúteos, Abdômen ou Panturrilha
- Use nomes completos dos exercícios em português (ex: "Supino Reto com Barra", "Agachamento Livre com Barra")
- O campo schedule deve ter os dias sugeridos (ex: "Seg, Qua, Sex")`;
}

// O modelo gratuito usado é de raciocínio (pensa antes de responder) e roda em
// infra compartilhada — pode passar de 30s para um treino completo. Precisa
// alinhar com o timeout do fetch abaixo.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const userEmail = await verifyAuthToken(req);
  if (!userEmail) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENROUTER_API_KEY não configurada." }, { status: 500 });
  }

  try {
    const body: GenerateRequest = await req.json();

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b:free",
        messages: [{ role: "user", content: buildPrompt(body) }],
        temperature: 0.7,
        // Modelo de raciocínio — os tokens de "pensamento" também contam nesse limite,
        // então precisa de mais margem que um modelo direto pra não truncar o JSON final.
        max_tokens: 8192,
      }),
      signal: AbortSignal.timeout(55000),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: `OpenRouter API error: ${err}` }, { status: 502 });
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    if (!clean) {
      return NextResponse.json({ error: "IA retornou resposta vazia. Tente novamente." }, { status: 502 });
    }

    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed?.workouts)) {
      return NextResponse.json({ error: "IA retornou formato inesperado. Tente novamente." }, { status: 502 });
    }

    return NextResponse.json(parsed as GenerateResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
