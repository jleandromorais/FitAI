package com.fitai.fitai_backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.util.List;

/**
 * Representa um exercício executado durante a sessão.
 * Agrupa todas as séries realizadas para aquele exercício.
 */
@Data
public class ExerciseSessionDto {
    @NotNull
    private Long             exerciseId; // ID do Exercise no banco

    @NotNull
    @Valid
    private List<SetSessionDto> sets;    // séries executadas
}
