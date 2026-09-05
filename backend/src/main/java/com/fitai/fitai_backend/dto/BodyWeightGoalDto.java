package com.fitai.fitai_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Saída enriquecida: os campos "gravados" (id, targetWeightKg, targetDate,
 * createdAt) mais os derivados do histórico de medidas na hora da leitura
 * (startWeightKg, currentWeightKg, direction, achieved, achievedOn). Nenhum
 * dos derivados existe no banco.
 */
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BodyWeightGoalDto {
    private Long id;
    private Double targetWeightKg;
    private LocalDate targetDate;
    private Instant createdAt;

    // Peso da medida-âncora (mais recente na data de criação da meta ou antes;
    // senão a 1ª medida de todas). Null quando o usuário não tem nenhuma medida.
    private Double startWeightKg;

    // Peso da medida mais recente. Null quando não há medidas.
    private Double currentWeightKg;

    // "cut" (alvo < inicial) | "bulk" (alvo > inicial) | null (sem medidas, ou
    // inicial == alvo).
    private String direction;

    private boolean achieved;

    // Data da 1ª medida que cruzou o alvo. Null quando achieved = false.
    private LocalDate achievedOn;
}
