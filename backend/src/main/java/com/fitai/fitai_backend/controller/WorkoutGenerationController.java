package com.fitai.fitai_backend.controller;

import com.fitai.fitai_backend.dto.WorkoutGenerationJobDto;
import com.fitai.fitai_backend.dto.WorkoutGenerationRequest;
import com.fitai.fitai_backend.service.WorkoutGenerationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/workout-generation-jobs")
@RequiredArgsConstructor
public class WorkoutGenerationController {

    private final WorkoutGenerationService workoutGenerationService;

    // 202 Accepted — o job é só enfileirado aqui, o resultado real chega
    // assíncrono via Kafka + polling em GET /{id}.
    @PostMapping
    public ResponseEntity<WorkoutGenerationJobDto> enqueue(@Valid @RequestBody WorkoutGenerationRequest req,
                                                            @AuthenticationPrincipal UserDetails user) {
        WorkoutGenerationJobDto dto = workoutGenerationService.enqueue(req, user.getUsername());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(dto);
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkoutGenerationJobDto> getStatus(@PathVariable Long id,
                                                              @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(workoutGenerationService.getStatus(id, user.getUsername()));
    }
}
