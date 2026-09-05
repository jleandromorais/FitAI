package com.fitai.fitai_backend.service;

import com.fitai.fitai_backend.dto.BodyMeasurementDto;
import com.fitai.fitai_backend.dto.BodyMeasurementRequest;
import com.fitai.fitai_backend.exception.ResourceNotFoundException;
import com.fitai.fitai_backend.model.BodyMeasurement;
import com.fitai.fitai_backend.model.User;
import com.fitai.fitai_backend.repository.BodyMeasurementRepository;
import com.fitai.fitai_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BodyMeasurementService {

    private static final Logger log = LoggerFactory.getLogger(BodyMeasurementService.class);

    private final BodyMeasurementRepository bodyMeasurementRepository;
    private final UserRepository userRepository;

    @Transactional
    public BodyMeasurementDto save(String email, BodyMeasurementRequest req) {
        log.info("Salvando medida corporal: email={}, measuredAt={}", email, req.getMeasuredAt());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));

        String note = req.getNote() == null ? null : req.getNote().trim();
        if (note != null && note.isEmpty()) note = null;

        BodyMeasurement measurement = BodyMeasurement.builder()
                .user(user)
                .measuredAt(req.getMeasuredAt())
                .weightKg(req.getWeightKg())
                .heightCm(req.getHeightCm())
                .bodyFatPct(req.getBodyFatPct())
                .note(note)
                .build();

        return toDto(bodyMeasurementRepository.save(measurement));
    }

    // Isolamento por usuário sempre pela query — nunca filtrado em memória.
    public List<BodyMeasurementDto> list(String email) {
        return bodyMeasurementRepository.findAllByUserEmailOrderByMeasuredAtDesc(email)
                .stream().map(this::toDto).toList();
    }

    /*
     * Confere que a medida existe E pertence ao usuário antes de apagar — mesmo
     * padrão de WorkoutService.delete()/BodyPhotoService.delete(). "Não
     * encontrada" e "é de outro usuário" são intencionalmente indistinguíveis
     * (sempre 404), nunca 403.
     */
    @Transactional
    public void delete(String email, Long id) {
        log.info("Deletando medida corporal: id={}, email={}", id, email);
        BodyMeasurement measurement = bodyMeasurementRepository.findByIdAndUserEmail(id, email)
                .orElseThrow(() -> new ResourceNotFoundException("Medida não encontrada."));
        bodyMeasurementRepository.delete(measurement);
    }

    private BodyMeasurementDto toDto(BodyMeasurement m) {
        return BodyMeasurementDto.builder()
                .id(m.getId())
                .measuredAt(m.getMeasuredAt())
                .weightKg(m.getWeightKg())
                .heightCm(m.getHeightCm())
                .bodyFatPct(m.getBodyFatPct())
                .note(m.getNote())
                .build();
    }
}
