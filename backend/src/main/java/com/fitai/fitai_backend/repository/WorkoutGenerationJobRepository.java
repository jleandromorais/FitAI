package com.fitai.fitai_backend.repository;

import com.fitai.fitai_backend.model.WorkoutGenerationJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.Optional;

public interface WorkoutGenerationJobRepository extends JpaRepository<WorkoutGenerationJob, Long> {
    Optional<WorkoutGenerationJob> findByIdAndUserEmail(Long id, String email);

    // Quantos jobs esse usuário criou desde `threshold` — base da cota por
    // janela deslizante em WorkoutGenerationService.enqueue. Contagem no banco
    // (não em memória) pra funcionar igual entre réplicas e sobreviver a
    // restart/deploy.
    long countByUserEmailAndCreatedAtAfter(String email, LocalDateTime threshold);
}
