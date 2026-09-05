package com.fitai.fitai_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class WorkoutGenerationJobDto {
    private Long id;

    // Nome do JobStatus como String — o frontend só compara com "DONE"/"FAILED"/etc,
    // sem necessidade de um enum espelhado do lado TS.
    private String status;

    // Só preenchido quando status = "DONE".
    private List<WorkoutRequest> workouts;

    // Só preenchido quando status = "FAILED".
    private String errorMessage;
}
