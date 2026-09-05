package com.fitai.fitai_backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/**
 * Uma linha datada de composição corporal — append-only, uma por registro,
 * nunca sobrescreve (mesmo modelo de BodyPhoto). IMC não é gravado aqui: é
 * derivado no cliente só quando há altura (Regra da Honestidade do Painel).
 */
@Entity
@Table(name = "body_measurements")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BodyMeasurement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "measured_at", nullable = false)
    private LocalDate measuredAt;

    // Único campo obrigatório de uma medida.
    @Column(name = "weight_kg", nullable = false)
    private Double weightKg;

    // Opcionais e independentes entre si — altura habilita o IMC no cliente,
    // bodyFat é só um registro a mais.
    @Column(name = "height_cm")
    private Double heightCm;

    @Column(name = "body_fat_pct")
    private Double bodyFatPct;

    @Column(name = "note", length = 280)
    private String note;
}
