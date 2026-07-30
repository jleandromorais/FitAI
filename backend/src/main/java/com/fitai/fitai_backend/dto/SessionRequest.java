package com.fitai.fitai_backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

/**
 * Corpo do POST /workouts/{id}/session.
 * Enviado pelo frontend ao utilizador clicar "Finalizar treino".
 * Contém todos os exercícios com as séries realmente executadas.
 */
@Data
public class SessionRequest {
    private Integer                  durationMinutes; // tempo total da sessão em minutos
    private String                   notes;           // anotações livres do utilizador

    @NotNull
    @Valid
    private List<ExerciseSessionDto> exercises;       // exercícios com sets realizados
}
