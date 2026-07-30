package com.fitai.fitai_backend.service;

import com.fitai.fitai_backend.dto.*;
import com.fitai.fitai_backend.exception.ResourceNotFoundException;
import com.fitai.fitai_backend.model.*;
import com.fitai.fitai_backend.repository.UserRepository;
import com.fitai.fitai_backend.repository.WorkoutRepository;
import com.fitai.fitai_backend.repository.WorkoutSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkoutServiceTest {

    @Mock WorkoutRepository        workoutRepository;
    @Mock UserRepository           userRepository;
    @Mock WorkoutSessionRepository sessionRepository;

    @InjectMocks WorkoutService workoutService;

    private User  user;
    private Workout workout;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).name("Ana").email("ana@test.com").build();

        SetData set = SetData.builder().id(1L).reps(10).weight(60.0).done(false).prev(null).build();
        Exercise exercise = Exercise.builder().id(1L).name("Supino").muscle("Peito")
                .restSeconds(90).sets(new ArrayList<>(List.of(set))).build();
        set.setExercise(exercise);

        workout = Workout.builder().id(1L).user(user).name("Treino A").code("A")
                .exercises(new ArrayList<>(List.of(exercise)))
                .tags(new ArrayList<>()).build();
        exercise.setWorkout(workout);
    }

    // ── listByUser ────────────────────────────────────────────────────────────

    @Test
    void listByUser_deveRetornarTreinosDoUsuario() {
        when(workoutRepository.findAllByUserEmail("ana@test.com")).thenReturn(List.of(workout));

        List<WorkoutDto> result = workoutService.listByUser("ana@test.com");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Treino A");
    }

    @Test
    void listByUser_semTreinos_deveRetornarListaVazia() {
        when(workoutRepository.findAllByUserEmail("ana@test.com")).thenReturn(List.of());

        assertThat(workoutService.listByUser("ana@test.com")).isEmpty();
    }

    // ── getById ───────────────────────────────────────────────────────────────

    @Test
    void getById_treinoExistente_deveRetornarDto() {
        when(workoutRepository.findByIdAndUserEmail(1L, "ana@test.com")).thenReturn(Optional.of(workout));

        WorkoutDto dto = workoutService.getById(1L, "ana@test.com");

        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getName()).isEqualTo("Treino A");
    }

    @Test
    void getById_treinoNaoEncontrado_deveLancarIllegalArgument() {
        when(workoutRepository.findByIdAndUserEmail(99L, "ana@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> workoutService.getById(99L, "ana@test.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Treino não encontrado");
    }

    // ── create ────────────────────────────────────────────────────────────────

    @Test
    void create_dadosValidos_deveSalvarERetornarDto() {
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));
        when(workoutRepository.save(any())).thenReturn(workout);

        WorkoutRequest req = new WorkoutRequest();
        req.setName("Treino A");
        req.setCode("A");
        req.setExercises(List.of());

        WorkoutDto dto = workoutService.create(req, "ana@test.com");

        assertThat(dto.getName()).isEqualTo("Treino A");
        verify(workoutRepository).save(any(Workout.class));
    }

    @Test
    void create_usuarioNaoEncontrado_deveLancarIllegalArgument() {
        when(userRepository.findByEmail("naoexiste@test.com")).thenReturn(Optional.empty());

        WorkoutRequest req = new WorkoutRequest();
        req.setName("X");
        req.setCode("X");

        assertThatThrownBy(() -> workoutService.create(req, "naoexiste@test.com"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("Usuário não encontrado");
    }

    // ── delete ────────────────────────────────────────────────────────────────

    @Test
    void delete_treinoDoUsuario_deveDeletar() {
        when(workoutRepository.findByIdAndUserEmail(1L, "ana@test.com")).thenReturn(Optional.of(workout));

        workoutService.delete(1L, "ana@test.com");

        verify(workoutRepository).delete(workout);
    }

    @Test
    void delete_treinoNaoEncontrado_deveLancarIllegalArgument() {
        when(workoutRepository.findByIdAndUserEmail(99L, "ana@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> workoutService.delete(99L, "ana@test.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ── toDto (campos calculados) ─────────────────────────────────────────────

    @Test
    void listByUser_totalSets_deveSerCalculadoCorretamente() {
        when(workoutRepository.findAllByUserEmail("ana@test.com")).thenReturn(List.of(workout));

        WorkoutDto dto = workoutService.listByUser("ana@test.com").get(0);

        assertThat(dto.getTotalSets()).isEqualTo(1); // 1 exercício com 1 série
    }

    @Test
    void listByUser_volume_deveSerCalculadoCorretamente() {
        when(workoutRepository.findAllByUserEmail("ana@test.com")).thenReturn(List.of(workout));

        WorkoutDto dto = workoutService.listByUser("ana@test.com").get(0);

        // 60kg × 10 reps = 600.0
        assertThat(dto.getVolume()).isEqualTo(600.0);
    }

    @Test
    void listByUser_duration_deveSerTotalSetsVezes3() {
        when(workoutRepository.findAllByUserEmail("ana@test.com")).thenReturn(List.of(workout));

        WorkoutDto dto = workoutService.listByUser("ana@test.com").get(0);

        assertThat(dto.getDuration()).isEqualTo(3); // 1 série × 3 min
    }

    // ── saveSession ───────────────────────────────────────────────────────────

    @Test
    void saveSession_seriesConcluidas_deveCalcularVolumeEAtualizarPrev() {
        when(workoutRepository.findByIdAndUserEmail(1L, "ana@test.com")).thenReturn(Optional.of(workout));
        when(workoutRepository.save(any())).thenReturn(workout);

        SetSessionDto setDto = new SetSessionDto();
        setDto.setSetIndex(0);
        setDto.setWeight(65.0);
        setDto.setReps(8);
        setDto.setDone(true);

        ExerciseSessionDto exDto = new ExerciseSessionDto();
        exDto.setExerciseId(1L);
        exDto.setSets(List.of(setDto));

        SessionRequest req = new SessionRequest();
        req.setExercises(List.of(exDto));
        req.setDurationMinutes(45);

        SessionResponse res = workoutService.saveSession(1L, req, "ana@test.com");

        assertThat(res.getSetsCompleted()).isEqualTo(1);
        assertThat(res.getTotalVolume()).isEqualTo(520.0); // 65 × 8
        assertThat(res.getDurationMinutes()).isEqualTo(45);

        // prev deve ter sido atualizado com o peso anterior (60.0)
        SetData updatedSet = workout.getExercises().get(0).getSets().get(0);
        assertThat(updatedSet.getPrev()).isEqualTo(60.0);
        assertThat(updatedSet.getWeight()).isEqualTo(65.0);
    }

    @Test
    void saveSession_treinoNaoEncontrado_deveLancarIllegalArgument() {
        when(workoutRepository.findByIdAndUserEmail(99L, "ana@test.com")).thenReturn(Optional.empty());

        SessionRequest req = new SessionRequest();
        req.setExercises(List.of());

        assertThatThrownBy(() -> workoutService.saveSession(99L, req, "ana@test.com"))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void saveSession_setIndexForaDosLimites_deveIgnorar() {
        when(workoutRepository.findByIdAndUserEmail(1L, "ana@test.com")).thenReturn(Optional.of(workout));
        when(workoutRepository.save(any())).thenReturn(workout);

        SetSessionDto setDto = new SetSessionDto();
        setDto.setSetIndex(99); // índice inválido
        setDto.setWeight(70.0);
        setDto.setReps(10);
        setDto.setDone(true);

        ExerciseSessionDto exDto = new ExerciseSessionDto();
        exDto.setExerciseId(1L);
        exDto.setSets(List.of(setDto));

        SessionRequest req = new SessionRequest();
        req.setExercises(List.of(exDto));

        SessionResponse res = workoutService.saveSession(1L, req, "ana@test.com");

        assertThat(res.getSetsCompleted()).isEqualTo(0);
        assertThat(res.getTotalVolume()).isEqualTo(0.0);
    }

    // ── getProgress ───────────────────────────────────────────────────────────

    @Test
    void getProgress_semTreinos_deveRetornarZeros() {
        when(workoutRepository.findAllByUserEmail("ana@test.com")).thenReturn(List.of());

        ProgressDto dto = workoutService.getProgress("ana@test.com");

        assertThat(dto.getTotalVolume()).isEqualTo(0.0);
        assertThat(dto.getTotalSetsCompleted()).isEqualTo(0);
        assertThat(dto.getTotalWorkouts()).isEqualTo(0);
        assertThat(dto.getExercises()).isEmpty();
    }

    @Test
    void getProgress_comSeriesConcluidas_deveAcumularVolume() {
        workout.getExercises().get(0).getSets().get(0).setDone(true);
        when(workoutRepository.findAllByUserEmail("ana@test.com")).thenReturn(List.of(workout));

        ProgressDto dto = workoutService.getProgress("ana@test.com");

        assertThat(dto.getTotalVolume()).isEqualTo(600.0); // 60 × 10
        assertThat(dto.getTotalSetsCompleted()).isEqualTo(1);
        assertThat(dto.getExercises()).hasSize(1);
        assertThat(dto.getExercises().get(0).getName()).isEqualTo("Supino");
    }
}
