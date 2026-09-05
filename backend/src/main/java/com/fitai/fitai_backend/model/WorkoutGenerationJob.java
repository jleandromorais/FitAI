package com.fitai.fitai_backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "workout_generation_jobs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class WorkoutGenerationJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private JobStatus status;

    // JSON do WorkoutGenerationRequest original — guardado pra o worker (ou uma
    // futura reprocessamento manual) não depender só do evento já publicado.
    @Column(name = "request_params", nullable = false, columnDefinition = "TEXT")
    private String requestParams;

    // JSON de List<WorkoutRequest> — só preenchido quando status = DONE.
    @Column(name = "result_json", columnDefinition = "TEXT")
    private String resultJson;

    // Só preenchido quando status = FAILED.
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    // Setados manualmente no service (sem @PrePersist/@PreUpdate) — mesmo
    // padrão de simplicidade já usado no resto do projeto.
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
