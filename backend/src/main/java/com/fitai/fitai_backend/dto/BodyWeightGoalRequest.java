package com.fitai.fitai_backend.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class BodyWeightGoalRequest {

    @NotNull
    @DecimalMin("20.0")
    @DecimalMax("500.0")
    private Double targetWeightKg;

    // Opcional. @FutureOrPresent ignora nulo por si só — a validação só morde
    // se o usuário mandar uma data, e nesse caso ela não pode estar no passado.
    @FutureOrPresent
    private LocalDate targetDate;
}
