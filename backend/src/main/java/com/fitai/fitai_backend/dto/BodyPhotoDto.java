package com.fitai.fitai_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class BodyPhotoDto {
    private Long id;
    private String muscleGroup;
    private String photoUrl;
    private LocalDate capturedAt;
}
