package com.fitai.fitai_backend.controller;

import com.fitai.fitai_backend.dto.BodyPhotoDto;
import com.fitai.fitai_backend.dto.BodyPhotoRequest;
import com.fitai.fitai_backend.service.BodyPhotoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/body-photos")
@RequiredArgsConstructor
public class BodyPhotoController {

    private final BodyPhotoService bodyPhotoService;

    @PostMapping
    public ResponseEntity<BodyPhotoDto> save(@Valid @RequestBody BodyPhotoRequest req,
                                              @AuthenticationPrincipal UserDetails user) {
        BodyPhotoDto saved = bodyPhotoService.save(user.getUsername(), req);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @GetMapping
    public ResponseEntity<List<BodyPhotoDto>> list(@RequestParam(required = false) String muscleGroup,
                                                     @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(bodyPhotoService.list(user.getUsername(), muscleGroup));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id,
                                       @AuthenticationPrincipal UserDetails user) {
        bodyPhotoService.delete(id, user.getUsername());
        return ResponseEntity.noContent().build();
    }
}
