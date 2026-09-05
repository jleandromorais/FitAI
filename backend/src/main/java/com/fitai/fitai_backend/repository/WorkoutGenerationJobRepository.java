package com.fitai.fitai_backend.repository;

import com.fitai.fitai_backend.model.WorkoutGenerationJob;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface WorkoutGenerationJobRepository extends JpaRepository<WorkoutGenerationJob, Long> {
    Optional<WorkoutGenerationJob> findByIdAndUserEmail(Long id, String email);
}
