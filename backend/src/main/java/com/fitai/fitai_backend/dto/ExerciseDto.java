package com.fitai.fitai_backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ExerciseDto {
    private Long id;

    @NotBlank // Exercise.name @Column(nullable = false)
    private String name;

    private String muscle;
    private Integer restSeconds;

    @Valid
    private List<SetDataDto> sets;
}
