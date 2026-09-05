package com.fitai.fitai_backend.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

// Espelha GenerateRequest do frontend (frontend/app/api/generate-workout/route.ts,
// que será portado pro worker) — mesmos cinco campos, todos texto livre já
// validado/normalizado no frontend (ex: "3 dias", "Apenas peso corporal").
@Data
public class WorkoutGenerationRequest {
    @NotBlank
    private String level;

    @NotBlank
    private String goal;

    @NotBlank
    private String days;

    @NotBlank
    private String equipment;

    @NotBlank
    private String duration;
}
