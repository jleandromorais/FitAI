package com.fitai.fitai_backend.dto;

import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

/**
 * Representa uma série executada durante uma sessão de treino.
 * O utilizador pode ter alterado o peso e as reps na hora — por isso
 * estes campos chegam com os valores reais do que foi feito.
 */
@Data
public class SetSessionDto {
    private Integer setIndex;  // posição da série dentro do exercício (0-based)

    @PositiveOrZero
    private Double  weight;    // peso realmente usado (pode diferir do planeado)

    @PositiveOrZero
    private Integer reps;      // reps realmente feitas

    private Boolean done;      // true = série concluída
}
