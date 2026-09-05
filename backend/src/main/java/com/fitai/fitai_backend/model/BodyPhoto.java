package com.fitai.fitai_backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "body_photos")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BodyPhoto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // String livre, mesma lista já usada em Exercise.muscle (Peitoral, Costas,
    // Ombros, Bíceps, Tríceps, Pernas, Glúteos, Abdômen, Panturrilha) — sem
    // enum novo, consistente com o resto do catálogo de exercícios.
    @Column(name = "muscle_group", nullable = false, length = 50)
    private String muscleGroup;

    // Nunca o arquivo binário — só a URL já hospedada (Vercel Blob/etc.),
    // enviada pelo Next.js depois do upload. O backend nunca vê a foto em si.
    @Column(name = "photo_url", nullable = false, columnDefinition = "TEXT")
    private String photoUrl;

    @Column(name = "captured_at", nullable = false)
    private LocalDate capturedAt;
}
