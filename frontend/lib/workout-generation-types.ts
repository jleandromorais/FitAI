// Tipos compartilhados do fluxo de geração de treino por IA.
//
// Antes viviam em app/api/generate-workout/route.ts (a rota Next.js que
// chamava a Groq diretamente). Essa rota foi deletada — a geração agora é
// assíncrona via Kafka: o frontend enfileira um job no backend Java
// (POST /workout-generation-jobs) e faz polling do status
// (GET /workout-generation-jobs/{id}) até DONE/FAILED. Ver
// app/(dashboard)/ai-gen/page.tsx.

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

// Espelha WorkoutGenerationJobDto do backend (dto/WorkoutGenerationJobDto.java).
// `workouts` só vem preenchido quando status === "DONE"; `errorMessage` só
// quando status === "FAILED".
export interface WorkoutGenerationJob {
  id: number;
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  workouts?: GeneratedWorkout[] | null;
  errorMessage?: string | null;
}
