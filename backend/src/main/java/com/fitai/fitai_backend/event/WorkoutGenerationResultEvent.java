package com.fitai.fitai_backend.event;

import com.fitai.fitai_backend.dto.WorkoutRequest;

import java.time.Instant;
import java.util.List;

// Produzido pelo worker Node.js (JSON.stringify puro) em
// fitai.workout-generation-result, consumido pelo backend via
// WorkoutGenerationResultListener. DONE e FAILED convivem no mesmo tópico —
// workouts só vem preenchido em DONE, errorMessage só em FAILED.
public record WorkoutGenerationResultEvent(
        Long jobId,
        String userEmail,
        String status,
        List<WorkoutRequest> workouts,
        String errorMessage,
        Instant completedAt
) {
}
