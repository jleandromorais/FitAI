package com.fitai.fitai_backend.dto;

import jakarta.validation.constraints.PositiveOrZero;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SetDataDto {
    private Long id;

    @PositiveOrZero
    private Integer reps;

    @PositiveOrZero
    private Double weight;

    private Boolean done;
    private Double prev;
}
