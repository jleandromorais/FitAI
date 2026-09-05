"use strict";

// Ported from frontend/app/api/generate-workout/route.ts — same business
// logic (rep schemes per goal/level, workout splits per day count, prompt
// text), just stripped of TypeScript types. Keep this in sync if the
// fitness-domain rules ever change on either side.

// Formato compacto que a IA de fato produz: uma série é sempre repetida
// idêntica setsCount vezes, então pedir o array inteiro (com 3-5 cópias do
// mesmo objeto) só gasta tokens à toa — o suficiente pra estourar o limite
// em treinos maiores e cortar o JSON no meio. Expande pro formato completo
// que o frontend espera depois de parsear.
function expandWorkouts(raw) {
  return raw.map(w => ({
    ...w,
    exercises: w.exercises.map(ex => {
      const count = Math.min(Math.max(Math.round(ex.setsCount) || 3, 1), 6);
      return {
        name: ex.name,
        muscle: ex.muscle,
        restSeconds: ex.restSeconds,
        sets: Array.from({ length: count }, () => ({
          reps: ex.reps,
          weight: ex.weight,
          done: false,
          prev: 0,
        })),
      };
    }),
  }));
}

// Dias fora de 3-6 não têm um split definido em getSplit() — cai no default
// "adaptado para N dias", e N cru (incluindo NaN) vaza pro prompt da IA
function parseValidDays(days) {
  const n = parseInt(days, 10);
  return Number.isInteger(n) && n >= 3 && n <= 6 ? n : 3;
}

function getSplit(days, goal, level) {
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

function getRepScheme(goal, level) {
  if (goal === "Força") return "3-5 séries de 3-6 reps com cargas altas (85-95% do max), descanso 3-5 min";
  if (goal === "Hipertrofia") return "3-4 séries de 8-12 reps com carga moderada-alta (70-80% do max), descanso 60-90s";
  if (goal === "Resistência") return "3-4 séries de 15-20 reps com carga moderada (50-65% do max), descanso 30-45s";
  if (goal === "Emagrecimento") return "3-4 séries de 12-15 reps com pouco descanso (30-45s), foco em circuito";
  return "3-4 séries de 8-12 reps, descanso 60-90s";
}

function buildPrompt(req) {
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

Retorne APENAS um JSON válido, sem markdown, sem texto fora do JSON. Cada série de um exercício é sempre igual, então informe só a contagem (setsCount) em vez de repetir o objeto:
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
          "setsCount": 4,
          "reps": 10,
          "weight": 60
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
- O campo schedule deve ter os dias sugeridos (ex: "Seg, Qua, Sex")
- setsCount é sempre um número (nunca um array) — a quantidade de séries do esquema acima`;
}

module.exports = {
  buildPrompt,
  getSplit,
  getRepScheme,
  parseValidDays,
  expandWorkouts,
};
