package com.fitai.fitai_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BodyMeasurementDto {
    private Long id;
    private LocalDate measuredAt;
    private Double weightKg;
    private Double heightCm;
    private Double bodyFatPct;
    private String note;
}
