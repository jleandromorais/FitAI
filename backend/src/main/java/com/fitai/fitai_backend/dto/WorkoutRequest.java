package com.fitai.fitai_backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class WorkoutRequest {
    @NotBlank
    private String name;

    @NotBlank
    @Size(max = 2) // bate com Workout.code @Column(length = 2)
    private String code;

    private String schedule;
    private List<String> tags;

    @Valid
    private List<ExerciseDto> exercises;
}
