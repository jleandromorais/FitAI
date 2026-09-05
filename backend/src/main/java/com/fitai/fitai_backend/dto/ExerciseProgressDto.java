package com.fitai.fitai_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * Resumo de evolução de um exercício.
 * Calculado a partir do peso atual (weight) e do peso anterior (prev)
 * já armazenados em cada SetData.
 */
@Data
@AllArgsConstructor
public class ExerciseProgressDto {
    private String name;         // nome do exercício
    private String muscle;       // grupo muscular
    private Double currentWeight; // maior peso atual em qualquer série
    private Double prevWeight;    // maior peso anterior (antes da última sessão)
    private Double delta;         // currentWeight - prevWeight (ganho de carga)
    private Integer totalSets;    // total de séries cadastradas
    private Double volume;        // peso × reps somado das séries feitas (done=true) deste exercício — real, não estimado
    private String suggestion;    // "subir_carga" | "manter_carga" | null — ver WorkoutService.computeSuggestion
}
