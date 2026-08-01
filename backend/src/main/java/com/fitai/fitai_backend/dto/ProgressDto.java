package com.fitai.fitai_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;

/**
 * Resposta completa do endpoint GET /workouts/progress.
 * Agrega estatísticas globais e a evolução por exercício.
 */
@Data
@AllArgsConstructor
public class ProgressDto {

    // ── Stats globais ────────────────────────────────────────────────────────

    /** Volume total acumulado em kg (peso × reps de todas as séries feitas) */
    private Double totalVolume;

    /** Total de séries marcadas como feitas (done = true) */
    private Integer totalSetsCompleted;

    /** Número de treinos cadastrados do utilizador */
    private Integer totalWorkouts;

    /**
     * Volume por treino: cada entrada é o volume de um Workout,
     * na ordem em que foram criados. Usado no gráfico de barras.
     */
    private List<Double> volumePerWorkout;

    /**
     * Labels correspondentes ao volumePerWorkout (nome do treino, ex: "Upper 1").
     * Mesmo tamanho que volumePerWorkout.
     */
    private List<String> workoutLabels;

    // ── Evolução por exercício ───────────────────────────────────────────────

    /**
     * Lista de exercícios com a evolução de carga.
     * Ordenada por delta decrescente (maior ganho primeiro).
     * Usado na aba "Força" e no card "Todos os exercícios".
     */
    private List<ExerciseProgressDto> exercises;

    /**
     * Dias consecutivos com treino nos dias agendados (schedule) dos treinos
     * do utilizador. Dias fora de qualquer schedule não contam nem quebram
     * o streak. Ver WorkoutService.computeCurrentStreak().
     */
    private Integer currentStreak;
}
