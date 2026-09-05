package com.fitai.fitai_backend.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Faixas conferidas aqui pelo Bean Validation, nunca re-checadas à mão no
 * controller/service (project-context.md). weightKg é o único obrigatório.
 */
@Getter
@Setter
public class BodyMeasurementRequest {

    @NotNull
    @DecimalMin("20.0")
    @DecimalMax("500.0")
    private Double weightKg;

    // Opcional — nulo é válido; se vier, tem que estar na faixa humana.
    @DecimalMin("50.0")
    @DecimalMax("260.0")
    private Double heightCm;

    @DecimalMin("1.0")
    @DecimalMax("70.0")
    private Double bodyFatPct;

    @NotNull
    @PastOrPresent
    private LocalDate measuredAt;

    @Size(max = 280)
    private String note;
}
