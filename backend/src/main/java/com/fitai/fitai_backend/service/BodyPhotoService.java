package com.fitai.fitai_backend.service;

import com.fitai.fitai_backend.dto.BodyPhotoDto;
import com.fitai.fitai_backend.dto.BodyPhotoRequest;
import com.fitai.fitai_backend.exception.ResourceNotFoundException;
import com.fitai.fitai_backend.model.BodyPhoto;
import com.fitai.fitai_backend.model.User;
import com.fitai.fitai_backend.repository.BodyPhotoRepository;
import com.fitai.fitai_backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class BodyPhotoService {

    private static final Logger log = LoggerFactory.getLogger(BodyPhotoService.class);

    private final BodyPhotoRepository bodyPhotoRepository;
    private final UserRepository userRepository;

    @Transactional
    public BodyPhotoDto save(String email, BodyPhotoRequest req) {
        log.info("Salvando foto de evolução: email={}, muscleGroup={}", email, req.getMuscleGroup());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));

        // trim — sem enum garantindo a grafia exata na entrada, um espaço a
        // mais na ponta não pode virar um grupo muscular "diferente" pro
        // filtro de list().
        BodyPhoto photo = BodyPhoto.builder()
                .user(user)
                .muscleGroup(req.getMuscleGroup().trim())
                .photoUrl(req.getPhotoUrl())
                .capturedAt(req.getCapturedAt())
                .build();

        BodyPhoto saved = bodyPhotoRepository.save(photo);
        return toDto(saved);
    }

    // muscleGroup nulo ou em branco = sem filtro (lista tudo do usuário).
    // Isolamento por usuário sempre pela query — nunca filtrado em memória
    // depois de carregar tudo, mesmo padrão de WorkoutRepository.
    public List<BodyPhotoDto> list(String email, String muscleGroup) {
        List<BodyPhoto> photos = (muscleGroup == null || muscleGroup.isBlank())
                ? bodyPhotoRepository.findAllByUserEmailOrderByCapturedAtDesc(email)
                : bodyPhotoRepository.findAllByUserEmailAndMuscleGroupIgnoreCaseOrderByCapturedAtDesc(email, muscleGroup.trim());

        return photos.stream().map(this::toDto).toList();
    }

    /*
     * Verifica se a foto existe E pertence ao usuário antes de apagar — mesmo
     * padrão de WorkoutService.delete(). "Não encontrada" e "é de outro
     * usuário" são intencionalmente indistinguíveis (sempre 404), nunca 403.
     */
    @Transactional
    public void delete(Long id, String email) {
        log.info("Deletando foto de evolução: id={}, email={}", id, email);
        BodyPhoto photo = bodyPhotoRepository.findByIdAndUserEmail(id, email)
                .orElseThrow(() -> new ResourceNotFoundException("Foto não encontrada."));
        bodyPhotoRepository.delete(photo);
    }

    private BodyPhotoDto toDto(BodyPhoto photo) {
        return BodyPhotoDto.builder()
                .id(photo.getId())
                .muscleGroup(photo.getMuscleGroup())
                .photoUrl(photo.getPhotoUrl())
                .capturedAt(photo.getCapturedAt())
                .build();
    }
}
