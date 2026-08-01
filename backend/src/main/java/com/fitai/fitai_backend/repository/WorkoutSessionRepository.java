package com.fitai.fitai_backend.repository;

import com.fitai.fitai_backend.model.WorkoutSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface WorkoutSessionRepository extends JpaRepository<WorkoutSession, Long> {

    List<WorkoutSession> findAllByUserEmailAndExecutedAtAfterOrderByExecutedAtDesc(
            String email, LocalDateTime after);

    // Sem corte de data — usado pelo cálculo de streak, que precisa olhar
    // o histórico inteiro (um streak real pode passar dos 90 dias que as
    // outras consultas limitam).
    List<WorkoutSession> findAllByUserEmail(String email);
}
