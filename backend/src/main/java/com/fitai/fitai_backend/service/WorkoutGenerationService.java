package com.fitai.fitai_backend.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitai.fitai_backend.dto.WorkoutGenerationJobDto;
import com.fitai.fitai_backend.dto.WorkoutGenerationRequest;
import com.fitai.fitai_backend.dto.WorkoutRequest;
import com.fitai.fitai_backend.event.WorkoutGenerationEventPublisher;
import com.fitai.fitai_backend.event.WorkoutGenerationRequestedEvent;
import com.fitai.fitai_backend.event.WorkoutGenerationResultEvent;
import com.fitai.fitai_backend.exception.ResourceNotFoundException;
import com.fitai.fitai_backend.model.JobStatus;
import com.fitai.fitai_backend.model.User;
import com.fitai.fitai_backend.model.WorkoutGenerationJob;
import com.fitai.fitai_backend.repository.UserRepository;
import com.fitai.fitai_backend.repository.WorkoutGenerationJobRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class WorkoutGenerationService {

    private static final Logger log = LoggerFactory.getLogger(WorkoutGenerationService.class);

    private static final String GENERIC_FAILURE_MESSAGE =
            "Não foi possível iniciar a geração de treino. Tente novamente.";

    private final WorkoutGenerationJobRepository jobRepository;
    private final UserRepository userRepository;
    private final WorkoutGenerationEventPublisher eventPublisher;

    // Instância própria, não injetada — mesmo padrão de SendGridClient. O Boot 4
    // deste projeto só autoconfigura um ObjectMapper Jackson 3 (tools.jackson),
    // não o com.fasterxml.jackson.databind.ObjectMapper (Jackson 2) usado aqui —
    // então injetar via DI não encontraria bean nenhum.
    private final ObjectMapper objectMapper = new ObjectMapper();

    /*
     * ENFILEIRAR GERAÇÃO DE TREINO
     * Salva o job como PENDING (id conhecido antes de publicar — essa mesma
     * identidade atravessa o tópico Kafka e a URL de polling do frontend) e
     * tenta publicar o pedido pro worker. Se a publicação falhar (broker fora
     * do ar, timeout), o job é marcado FAILED na hora, em vez de ficar
     * pendurado em PENDING pra sempre sem ninguém nunca processá-lo.
     */
    @Transactional
    public WorkoutGenerationJobDto enqueue(WorkoutGenerationRequest req, String email) {
        log.info("Enfileirando geração de treino: email={}", email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Enqueue falhou — usuário não encontrado: email={}", email);
                    return new ResourceNotFoundException("Usuário não encontrado.");
                });

        LocalDateTime now = LocalDateTime.now();
        WorkoutGenerationJob job = WorkoutGenerationJob.builder()
                .user(user)
                .status(JobStatus.PENDING)
                .requestParams(writeJson(req))
                .createdAt(now)
                .updatedAt(now)
                .build();
        job = jobRepository.save(job);

        WorkoutGenerationRequestedEvent event = new WorkoutGenerationRequestedEvent(
                job.getId(),
                email,
                req.getLevel(),
                req.getGoal(),
                req.getDays(),
                req.getEquipment(),
                req.getDuration(),
                java.time.Instant.now()
        );

        boolean published = eventPublisher.publish(event);
        if (!published) {
            log.warn("Publicação falhou — marcando job como FAILED: jobId={}, email={}", job.getId(), email);
            job.setStatus(JobStatus.FAILED);
            job.setErrorMessage(GENERIC_FAILURE_MESSAGE);
            job.setUpdatedAt(LocalDateTime.now());
            job = jobRepository.save(job);
        }

        log.info("Job de geração de treino enfileirado: jobId={}, email={}, status={}", job.getId(), email, job.getStatus());
        return toDto(job);
    }

    /*
     * CONSULTAR STATUS DO JOB (polling do frontend)
     * Mesmo padrão de ownership de WorkoutService/BodyPhotoService:
     * findByIdAndUserEmail ou 404 — "não encontrado" e "é de outro usuário"
     * são intencionalmente indistinguíveis.
     */
    public WorkoutGenerationJobDto getStatus(Long id, String email) {
        WorkoutGenerationJob job = jobRepository.findByIdAndUserEmail(id, email)
                .orElseThrow(() -> {
                    log.warn("Job de geração de treino não encontrado: id={}, email={}", id, email);
                    return new ResourceNotFoundException("Job de geração de treino não encontrado.");
                });
        return toDto(job);
    }

    /*
     * PROCESSAR RESULTADO DO WORKER (consumido via WorkoutGenerationResultListener)
     * Nunca lança exceção pra fora — é um listener Kafka interno, não um
     * endpoint de usuário: uma corrida rara (job não encontrado) ou uma
     * inconsistência de dados (userEmail não bate com o dono do job) só é
     * logada, nunca derruba o container do listener.
     */
    @Transactional
    public void handleResult(WorkoutGenerationResultEvent event) {
        Optional<WorkoutGenerationJob> maybeJob = jobRepository.findById(event.jobId());
        if (maybeJob.isEmpty()) {
            log.warn("Resultado de geração de treino recebido para job inexistente: jobId={}", event.jobId());
            return;
        }

        WorkoutGenerationJob job = maybeJob.get();
        if (job.getUser() != null && job.getUser().getEmail() != null
                && !job.getUser().getEmail().equals(event.userEmail())) {
            log.warn("userEmail do evento de resultado não bate com o dono do job: jobId={}, dono={}, eventoUserEmail={}",
                    event.jobId(), job.getUser().getEmail(), event.userEmail());
        }

        JobStatus status;
        try {
            status = JobStatus.valueOf(event.status());
        } catch (IllegalArgumentException e) {
            log.warn("Status desconhecido em evento de resultado de geração de treino: jobId={}, status={}", event.jobId(), event.status());
            return;
        }

        job.setStatus(status);
        if (status == JobStatus.DONE) {
            job.setResultJson(writeJson(event.workouts()));
            job.setErrorMessage(null);
        } else if (status == JobStatus.FAILED) {
            job.setErrorMessage(event.errorMessage());
            job.setResultJson(null);
        }
        job.setUpdatedAt(LocalDateTime.now());
        jobRepository.save(job);
        log.info("Job de geração de treino atualizado: jobId={}, status={}", event.jobId(), status);
    }

    private WorkoutGenerationJobDto toDto(WorkoutGenerationJob job) {
        List<WorkoutRequest> workouts = job.getStatus() == JobStatus.DONE
                ? readWorkouts(job.getResultJson())
                : null;
        String errorMessage = job.getStatus() == JobStatus.FAILED ? job.getErrorMessage() : null;

        return WorkoutGenerationJobDto.builder()
                .id(job.getId())
                .status(job.getStatus().name())
                .workouts(workouts)
                .errorMessage(errorMessage)
                .build();
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            // Nunca esperado — os tipos envolvidos (WorkoutGenerationRequest,
            // List<WorkoutRequest>) são POJOs simples sem nada não serializável.
            throw new IllegalStateException("Falha ao serializar dado de geração de treino.", e);
        }
    }

    private List<WorkoutRequest> readWorkouts(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<List<WorkoutRequest>>() {});
        } catch (JsonProcessingException e) {
            log.warn("Falha ao desserializar resultJson de job de geração de treino: erro={}", e.getMessage());
            return null;
        }
    }
}
