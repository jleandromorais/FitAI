package com.fitai.fitai_backend.service;

import com.fitai.fitai_backend.dto.WorkoutGenerationJobDto;
import com.fitai.fitai_backend.dto.WorkoutGenerationRequest;
import com.fitai.fitai_backend.dto.WorkoutRequest;
import com.fitai.fitai_backend.event.WorkoutGenerationEventPublisher;
import com.fitai.fitai_backend.event.WorkoutGenerationResultEvent;
import com.fitai.fitai_backend.exception.ResourceNotFoundException;
import com.fitai.fitai_backend.model.JobStatus;
import com.fitai.fitai_backend.model.User;
import com.fitai.fitai_backend.model.WorkoutGenerationJob;
import com.fitai.fitai_backend.repository.UserRepository;
import com.fitai.fitai_backend.repository.WorkoutGenerationJobRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

// Isolamento REAL entre usuários (repository de verdade, não mockado) é
// provado em WorkoutGenerationControllerIT — mesmo espírito de
// BodyPhotoServiceTest/BodyPhotoControllerIT.
@ExtendWith(MockitoExtension.class)
class WorkoutGenerationServiceTest {

    @Mock WorkoutGenerationJobRepository jobRepository;
    @Mock UserRepository userRepository;
    @Mock WorkoutGenerationEventPublisher eventPublisher;

    private WorkoutGenerationService service;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).name("Ana").email("ana@test.com").build();
        service = new WorkoutGenerationService(jobRepository, userRepository, eventPublisher);
    }

    private static WorkoutGenerationRequest request() {
        WorkoutGenerationRequest req = new WorkoutGenerationRequest();
        req.setLevel("Iniciante");
        req.setGoal("Hipertrofia");
        req.setDays("3 dias");
        req.setEquipment("Apenas peso corporal");
        req.setDuration("30 min");
        return req;
    }

    @Test
    void enqueue_publicacaoComSucesso_salvaJobPendingEPublica() {
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));
        when(jobRepository.save(any(WorkoutGenerationJob.class))).thenAnswer(inv -> {
            WorkoutGenerationJob j = inv.getArgument(0);
            if (j.getId() == null) j.setId(42L);
            return j;
        });
        when(eventPublisher.publish(any())).thenReturn(true);

        WorkoutGenerationJobDto dto = service.enqueue(request(), "ana@test.com");

        assertThat(dto.getId()).isEqualTo(42L);
        assertThat(dto.getStatus()).isEqualTo("PENDING");
        assertThat(dto.getWorkouts()).isNull();
        assertThat(dto.getErrorMessage()).isNull();

        // Só uma chamada a save() — não houve necessidade de marcar FAILED depois
        verify(jobRepository, times(1)).save(any(WorkoutGenerationJob.class));

        ArgumentCaptor<WorkoutGenerationJob> captor = ArgumentCaptor.forClass(WorkoutGenerationJob.class);
        verify(jobRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(JobStatus.PENDING);
        assertThat(captor.getValue().getUser()).isEqualTo(user);
        assertThat(captor.getValue().getRequestParams()).contains("Hipertrofia");
    }

    @Test
    void enqueue_publicacaoFalha_marcaJobComoFailedImediatamente() {
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));
        when(jobRepository.save(any(WorkoutGenerationJob.class))).thenAnswer(inv -> {
            WorkoutGenerationJob j = inv.getArgument(0);
            if (j.getId() == null) j.setId(42L);
            return j;
        });
        when(eventPublisher.publish(any())).thenReturn(false);

        WorkoutGenerationJobDto dto = service.enqueue(request(), "ana@test.com");

        assertThat(dto.getStatus()).isEqualTo("FAILED");
        assertThat(dto.getErrorMessage()).isEqualTo("Não foi possível iniciar a geração de treino. Tente novamente.");

        // Uma vez pra salvar PENDING, outra pra atualizar pra FAILED
        verify(jobRepository, times(2)).save(any(WorkoutGenerationJob.class));
    }

    @Test
    void enqueue_usuarioNaoEncontrado_lancaExcecao() {
        when(userRepository.findByEmail("fantasma@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.enqueue(request(), "fantasma@test.com"))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(jobRepository, never()).save(any());
        verify(eventPublisher, never()).publish(any());
    }

    @Test
    void getStatus_jobDesconhecidoOuDeOutroUsuario_lancaExcecao() {
        when(jobRepository.findByIdAndUserEmail(99L, "ana@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getStatus(99L, "ana@test.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void getStatus_jobPending_devolveSemWorkoutsNemErro() {
        WorkoutGenerationJob job = WorkoutGenerationJob.builder()
                .id(1L).user(user).status(JobStatus.PENDING)
                .requestParams("{}")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build();
        when(jobRepository.findByIdAndUserEmail(1L, "ana@test.com")).thenReturn(Optional.of(job));

        WorkoutGenerationJobDto dto = service.getStatus(1L, "ana@test.com");

        assertThat(dto.getStatus()).isEqualTo("PENDING");
        assertThat(dto.getWorkouts()).isNull();
        assertThat(dto.getErrorMessage()).isNull();
    }

    @Test
    void getStatus_jobDone_desserializaResultJson() {
        String resultJson = "[{\"name\":\"Treino A\",\"code\":\"A\",\"schedule\":null,\"tags\":null,\"exercises\":null}]";
        WorkoutGenerationJob job = WorkoutGenerationJob.builder()
                .id(1L).user(user).status(JobStatus.DONE)
                .requestParams("{}").resultJson(resultJson)
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build();
        when(jobRepository.findByIdAndUserEmail(1L, "ana@test.com")).thenReturn(Optional.of(job));

        WorkoutGenerationJobDto dto = service.getStatus(1L, "ana@test.com");

        assertThat(dto.getStatus()).isEqualTo("DONE");
        assertThat(dto.getWorkouts()).hasSize(1);
        assertThat(dto.getWorkouts().get(0).getName()).isEqualTo("Treino A");
    }

    @Test
    void handleResult_jobConhecido_atualizaStatusEResultado() {
        WorkoutGenerationJob job = WorkoutGenerationJob.builder()
                .id(42L).user(user).status(JobStatus.PENDING)
                .requestParams("{}")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build();
        when(jobRepository.findById(42L)).thenReturn(Optional.of(job));
        when(jobRepository.save(any(WorkoutGenerationJob.class))).thenAnswer(inv -> inv.getArgument(0));

        WorkoutRequest w = new WorkoutRequest();
        w.setName("Treino A");
        w.setCode("A");

        WorkoutGenerationResultEvent event = new WorkoutGenerationResultEvent(
                42L, "ana@test.com", "DONE", List.of(w), null, Instant.now());

        service.handleResult(event);

        ArgumentCaptor<WorkoutGenerationJob> captor = ArgumentCaptor.forClass(WorkoutGenerationJob.class);
        verify(jobRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(JobStatus.DONE);
        assertThat(captor.getValue().getResultJson()).contains("Treino A");
    }

    @Test
    void handleResult_jobFailed_atualizaStatusEErro() {
        WorkoutGenerationJob job = WorkoutGenerationJob.builder()
                .id(42L).user(user).status(JobStatus.PENDING)
                .requestParams("{}")
                .createdAt(LocalDateTime.now()).updatedAt(LocalDateTime.now())
                .build();
        when(jobRepository.findById(42L)).thenReturn(Optional.of(job));
        when(jobRepository.save(any(WorkoutGenerationJob.class))).thenAnswer(inv -> inv.getArgument(0));

        WorkoutGenerationResultEvent event = new WorkoutGenerationResultEvent(
                42L, "ana@test.com", "FAILED", null, "Cota diária da IA excedida, tente novamente mais tarde.", Instant.now());

        service.handleResult(event);

        ArgumentCaptor<WorkoutGenerationJob> captor = ArgumentCaptor.forClass(WorkoutGenerationJob.class);
        verify(jobRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(JobStatus.FAILED);
        assertThat(captor.getValue().getErrorMessage()).isEqualTo("Cota diária da IA excedida, tente novamente mais tarde.");
    }

    @Test
    void handleResult_jobIdDesconhecido_naoLancaExcecaoENaoSalva() {
        when(jobRepository.findById(999L)).thenReturn(Optional.empty());

        WorkoutGenerationResultEvent event = new WorkoutGenerationResultEvent(
                999L, "ana@test.com", "DONE", List.of(), null, Instant.now());

        assertThatCode(() -> service.handleResult(event)).doesNotThrowAnyException();

        verify(jobRepository, never()).save(any());
    }
}
