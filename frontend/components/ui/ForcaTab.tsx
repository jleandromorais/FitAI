"use client";

import { Dumbbell } from "lucide-react";
import { LineChart } from "@/components/ui/Charts";
import { ExerciseProgress, ProgressData } from "@/hooks/useProgress";

function deltaColor(d: number): string {
  if (d > 0) return "var(--accent)";
  if (d < 0) return "var(--danger)";
  return "var(--text-mute)";
}

interface ForcaTabProps {
  data: ProgressData;
  exercisesWithLoad: ExerciseProgress[];
  selectedEx: ExerciseProgress | undefined;
  loadHistory: number[];
  exIdx: number;
  onSelectExercise: (idx: number) => void;
}

export default function ForcaTab({ data, exercisesWithLoad, selectedEx, loadHistory, exIdx, onSelectExercise }: ForcaTabProps) {
  return (
    <div className="grid-3">
      <div className="col-stack">
        {selectedEx && exercisesWithLoad.length > 0 ? (
          <>
            {/* Gráfico do exercício seleccionado */}
            <div className="card">
              <div className="row between" style={{ marginBottom: 18 }}>
                <div>
                  <div className="h-eyebrow">{selectedEx.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>
                    {selectedEx.muscle}
                  </div>
                  <div className="row gap-3" style={{ alignItems: "baseline", marginTop: 8 }}>
                    <div className="h-display" style={{ fontSize: 36 }}>
                      {selectedEx.currentWeight}
                      <span className="stat-unit" style={{ fontSize: 16 }}>kg</span>
                    </div>
                    {/* Delta: positivo = ganho, negativo = perda, zero = sem histórico */}
                    {selectedEx.delta !== 0 && (
                      <span className="chip" style={{
                        background: selectedEx.delta > 0 ? "var(--accent-soft)" : "rgba(255,60,60,0.1)",
                        color: deltaColor(selectedEx.delta),
                        border: `1px solid ${deltaColor(selectedEx.delta)}`,
                      }}>
                        {selectedEx.delta > 0 ? "+" : ""}{selectedEx.delta}kg
                      </span>
                    )}
                    {selectedEx.delta === 0 && selectedEx.prevWeight === 0 && (
                      <span style={{ fontSize: 12, color: "var(--text-mute)" }}>
                        Execute o treino para ver a evolução
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Gráfico de linha da evolução de carga */}
              <LineChart
                data={loadHistory}
                height={240}
                showDots
                yLabel={v => `${v.toFixed(0)}kg`}
              />
            </div>

            {/* Cards de stats do exercício seleccionado */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
              <div className="card">
                <div className="h-eyebrow">Atual</div>
                <div className="h-display" style={{ fontSize: 26, marginTop: 8 }}>
                  {selectedEx.currentWeight}<span className="stat-unit">kg</span>
                </div>
              </div>
              <div className="card">
                <div className="h-eyebrow">Anterior</div>
                <div className="h-display" style={{ fontSize: 26, marginTop: 8 }}>
                  {selectedEx.prevWeight > 0
                    ? <>{selectedEx.prevWeight}<span className="stat-unit">kg</span></>
                    : <span style={{ color: "var(--text-mute)", fontSize: 16 }}>—</span>
                  }
                </div>
              </div>
              <div className="card">
                <div className="h-eyebrow">Ganho</div>
                <div className="h-display" style={{ fontSize: 26, marginTop: 8, color: deltaColor(selectedEx.delta) }}>
                  {selectedEx.delta > 0 ? "+" : ""}{selectedEx.delta}
                  <span className="stat-unit">kg</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Nenhum exercício com carga ainda */
          <div className="card" style={{ textAlign: "center", padding: 48 }}>
            <Dumbbell size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 14, color: "var(--text-mute)" }}>
              Execute um treino para ver a evolução de carga.
            </div>
          </div>
        )}
      </div>

      {/* Lista de todos os exercícios com evolução */}
      <div className="card">
        <div className="h-eyebrow" style={{ marginBottom: 16 }}>Todos os exercícios</div>
        <div className="col gap-3" style={{ maxHeight: 480, overflowY: "auto" }}>
          {data.exercises.length > 0 ? data.exercises.filter(e => e.prevWeight > 0).map(ex => (
            <div
              key={ex.name}
              className="row between"
              style={{
                cursor: ex.currentWeight > 0 ? "pointer" : "default",
                padding: "8px 10px", borderRadius: 8,
                // Destaque no exercício seleccionado
                background: exercisesWithLoad[exIdx]?.name === ex.name
                  ? "var(--accent-soft)" : "transparent",
                transition: "background 0.15s",
              }}
              onClick={() => {
                const idx = exercisesWithLoad.findIndex(e => e.name === ex.name);
                if (idx !== -1) onSelectExercise(idx);
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{ex.name}</div>
                <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>
                  {ex.muscle}
                </div>
                {/* Delta de carga vs sessão anterior */}
                {ex.delta !== 0 && (
                  <div style={{ fontSize: 11, marginTop: 2, fontWeight: 600, color: deltaColor(ex.delta) }}>
                    {ex.delta > 0 ? "↑ +" : "↓ "}{ex.delta}kg vs anterior
                  </div>
                )}
              </div>
              <div className="h-mono" style={{ fontSize: 14, fontWeight: 600 }}>
                {ex.currentWeight > 0 ? `${ex.currentWeight}kg` : "PC"}
              </div>
            </div>
          )) : (
            <p style={{ fontSize: 13, color: "var(--text-mute)" }}>
              Nenhum exercício encontrado.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
