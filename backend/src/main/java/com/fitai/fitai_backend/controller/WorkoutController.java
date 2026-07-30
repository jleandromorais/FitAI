package com.fitai.fitai_backend.controller;

import com.fitai.fitai_backend.dto.*;
import com.fitai.fitai_backend.service.WorkoutService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/workouts")
@RequiredArgsConstructor
@Validated
public class WorkoutController {

    private final WorkoutService workoutService;

    @GetMapping
    public ResponseEntity<List<WorkoutDto>> list(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(workoutService.listByUser(user.getUsername()));
    }

    // /progress deve vir ANTES de /{id} para o Spring não tentar converter "progress" em Long
    @GetMapping("/progress")
    public ResponseEntity<ProgressDto> progress(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(workoutService.getProgress(user.getUsername()));
    }

    @GetMapping("/sessions/recent")
    public ResponseEntity<List<SessionHistoryDto>> recentSessions(
            @RequestParam(defaultValue = "30") @Min(1) @Max(3650) int days,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(workoutService.getRecentSessions(user.getUsername(), days));
    }

    @GetMapping("/{id}")
    public ResponseEntity<WorkoutDto> get(@PathVariable Long id,
                                          @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(workoutService.getById(id, user.getUsername()));
    }

    @PostMapping
    public ResponseEntity<WorkoutDto> create(@Valid @RequestBody WorkoutRequest req,
                                             @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(workoutService.create(req, user.getUsername()));
    }

    // Recebe os dados reais da sessão (peso/reps executados) e persiste no banco
    @PostMapping("/{id}/session")
    public ResponseEntity<SessionResponse> saveSession(@PathVariable Long id,
                                                       @Valid @RequestBody SessionRequest req,
                                                       @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(workoutService.saveSession(id, req, user.getUsername()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WorkoutDto> update(@PathVariable Long id,
                                             @Valid @RequestBody WorkoutRequest req,
                                             @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(workoutService.update(id, req, user.getUsername()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal UserDetails user) {
        workoutService.delete(id, user.getUsername());
        return ResponseEntity.noContent().build();
    }
}
