package com.fitai.fitai_backend.repository;

import com.fitai.fitai_backend.model.BodyPhoto;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BodyPhotoRepository extends JpaRepository<BodyPhoto, Long> {

    List<BodyPhoto> findAllByUserEmailOrderByCapturedAtDesc(String email);

    // IgnoreCase — "Peitoral"/"peitoral" tem que ser o mesmo grupo pro filtro,
    // mesmo sem enum garantindo a grafia exata na entrada.
    List<BodyPhoto> findAllByUserEmailAndMuscleGroupIgnoreCaseOrderByCapturedAtDesc(String email, String muscleGroup);

    Optional<BodyPhoto> findByIdAndUserEmail(Long id, String email);
}
