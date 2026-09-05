package com.fitai.fitai_backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Uma meta de peso: peso-alvo + data-alvo opcional. NÃO tem coluna "achieved" —
 * "meta atingida" é sempre computada do histórico real de medidas na leitura
 * (BodyWeightGoalService.evaluate), nunca um flag gravado. Ver DESIGN.md,
 * "A Regra da Honestidade do Painel".
 */
@Entity
@Table(name = "body_weight_goals")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BodyWeightGoal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "target_weight_kg", nullable = false)
    private Double targetWeightKg;

    @Column(name = "target_date")
    private LocalDate targetDate;

    // Setado manualmente no service (sem @PrePersist) — mesma convenção de
    // WorkoutGenerationJob. Serve de âncora pro "peso inicial" da meta.
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
}
