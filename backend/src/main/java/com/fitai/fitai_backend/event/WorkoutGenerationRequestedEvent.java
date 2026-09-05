package com.fitai.fitai_backend.event;

import java.time.Instant;

// Produzido pelo backend em fitai.workout-generation-requested, consumido pelo
// worker Node.js. jobId é o id da linha WorkoutGenerationJob já persistida —
// a mesma identidade atravessa os dois tópicos e a URL de polling do frontend.
public record WorkoutGenerationRequestedEvent(
        Long jobId,
        String userEmail,
        String level,
        String goal,
        String days,
        String equipment,
        String duration,
        Instant requestedAt
) {
}
