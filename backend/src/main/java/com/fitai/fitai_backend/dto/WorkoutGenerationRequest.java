package com.fitai.fitai_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

// Espelha GenerateRequest do frontend (frontend/app/(dashboard)/ai-gen/page.tsx) —
// os mesmos cinco campos. Na UI são chips de valor fixo, mas o endpoint aceita
// JSON arbitrário: sem o allowlist abaixo, um cliente malicioso injeta texto
// livre que o worker interpola cru no prompt da Groq (ver
// worker/src/promptBuilder.js#buildPrompt). Os @Pattern recusam qualquer valor
// que não seja exatamente uma das opções conhecidas — a validação falha vira
// 400 no GlobalExceptionHandler.
@Data
public class WorkoutGenerationRequest {

    @NotBlank
    @Pattern(regexp = "Iniciante|Intermediário|Avançado", message = "Nível inválido.")
    private String level;

    @NotBlank
    @Pattern(regexp = "Hipertrofia|Força|Resistência|Emagrecimento", message = "Objetivo inválido.")
    private String goal;

    @NotBlank
    @Pattern(regexp = "[3-6] dias", message = "Dias inválidos.")
    private String days;

    @NotBlank
    @Pattern(regexp = "Academia completa|Halteres \\+ barra|Apenas peso corporal", message = "Equipamento inválido.")
    private String equipment;

    @NotBlank
    @Pattern(regexp = "30 min|45 min|60 min|90 min", message = "Duração inválida.")
    private String duration;
}
