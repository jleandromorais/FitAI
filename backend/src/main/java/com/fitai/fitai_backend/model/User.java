package com.fitai.fitai_backend.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = true)
    private String password;

    @Column(nullable = true, unique = true)
    private String googleId;

    @Column(nullable = true, length = 512)
    private String refreshToken;

    @Column(nullable = true)
    private Instant refreshTokenExpiry;

    @Column(nullable = true, length = 512)
    private String resetToken;

    @Column(nullable = true)
    private Instant resetTokenExpiry;
}
