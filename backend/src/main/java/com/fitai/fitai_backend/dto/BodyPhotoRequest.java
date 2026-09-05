package com.fitai.fitai_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class BodyPhotoRequest {

    @NotBlank
    @Size(max = 50)
    private String muscleGroup;

    // Só https:// — a URL sempre vem de um upload já feito num storage
    // confiável (Vercel Blob), nunca digitada por um usuário; restringir o
    // esquema evita guardar (e depois servir de volta como <img src>) um
    // valor tipo "javascript:" ou "data:" vindo de um cliente malicioso.
    @NotBlank
    @Size(max = 2048)
    @Pattern(regexp = "^https://.+")
    private String photoUrl;

    @NotNull
    @PastOrPresent
    private LocalDate capturedAt;
}
