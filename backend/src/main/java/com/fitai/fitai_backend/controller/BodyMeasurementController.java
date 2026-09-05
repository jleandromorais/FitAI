package com.fitai.fitai_backend.controller;

import com.fitai.fitai_backend.dto.BodyMeasurementDto;
import com.fitai.fitai_backend.dto.BodyMeasurementRequest;
import com.fitai.fitai_backend.service.BodyMeasurementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/body-measurements")
@RequiredArgsConstructor
public class BodyMeasurementController {

    private final BodyMeasurementService bodyMeasurementService;

    @PostMapping
    public ResponseEntity<BodyMeasurementDto> save(@Valid @RequestBody BodyMeasurementRequest req,
                                                   @AuthenticationPrincipal UserDetails user) {
        BodyMeasurementDto saved = bodyMeasurementService.save(user.getUsername(), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping
    public ResponseEntity<List<BodyMeasurementDto>> list(@AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(bodyMeasurementService.list(user.getUsername()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal UserDetails user) {
        bodyMeasurementService.delete(user.getUsername(), id);
        return ResponseEntity.noContent().build();
    }
}
