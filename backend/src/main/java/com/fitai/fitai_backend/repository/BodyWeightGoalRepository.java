package com.fitai.fitai_backend.repository;

import com.fitai.fitai_backend.model.BodyWeightGoal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BodyWeightGoalRepository extends JpaRepository<BodyWeightGoal, Long> {

    List<BodyWeightGoal> findAllByUserEmailOrderByCreatedAtDesc(String email);

    Optional<BodyWeightGoal> findByIdAndUserEmail(Long id, String email);
}
