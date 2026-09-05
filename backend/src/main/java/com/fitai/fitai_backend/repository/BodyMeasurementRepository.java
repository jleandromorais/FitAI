package com.fitai.fitai_backend.repository;

import com.fitai.fitai_backend.model.BodyMeasurement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BodyMeasurementRepository extends JpaRepository<BodyMeasurement, Long> {

    // Isolamento por usuário sempre na query (join user.email), nunca filtrado
    // em memória depois — mesmo padrão de BodyPhotoRepository/WorkoutRepository.
    List<BodyMeasurement> findAllByUserEmailOrderByMeasuredAtDesc(String email);

    Optional<BodyMeasurement> findByIdAndUserEmail(Long id, String email);
}
