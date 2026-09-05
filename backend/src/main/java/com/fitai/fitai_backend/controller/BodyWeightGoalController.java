package com.fitai.fitai_backend.controller;

import com.fitai.fitai_backend.dto.BodyWeightGoalDto;
import com.fitai.fitai_backend.dto.BodyWeightGoalRequest;
import com.fitai.fitai_backend.service.BodyWeightGoalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/body-weight-goals")
@RequiredArgsConstructor
public class BodyWeightGoalController {

    private final BodyWeightGoalService bodyWeightGoalService;

    @PostMapping
    public ResponseEntity<BodyWeightGoalDto> save(@Valid @RequestBody BodyWeightGoalRequest req,
                                                  @AuthenticationPrincipal UserDetails user) {
        BodyWeightGoalDto saved = bodyWeightGoalService.save(user.getUsername(), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping
    public ResponseEntity<List<BodyWeightGoalDto>> list(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(bodyWeightGoalService.list(user.getUsername()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal UserDetails user) {
        bodyWeightGoalService.delete(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }
}
