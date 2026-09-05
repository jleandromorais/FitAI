
package com.fitai.fitai_backend.service;

import com.fitai.fitai_backend.dto.BodyPhotoDto;
import com.fitai.fitai_backend.dto.BodyPhotoRequest;
import com.fitai.fitai_backend.exception.ResourceNotFoundException;
import com.fitai.fitai_backend.model.BodyPhoto;
import com.fitai.fitai_backend.model.User;
import com.fitai.fitai_backend.repository.BodyPhotoRepository;
import com.fitai.fitai_backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

// Isolamento REAL entre usuários (repository de verdade, não mockado) é
// provado em BodyPhotoControllerIT — um teste aqui com o repository mockado
// só provaria que o service repassa o email recebido, o que os testes de
// list() abaixo já cobrem implicitamente (o stub só casa com o email certo).
@ExtendWith(MockitoExtension.class)
class BodyPhotoServiceTest {

    @Mock BodyPhotoRepository bodyPhotoRepository;
    @Mock UserRepository      userRepository;

    @InjectMocks BodyPhotoService bodyPhotoService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).name("Ana").email("ana@test.com").build();
    }

    private BodyPhoto photo(String muscle, String url, LocalDate date) {
        return BodyPhoto.builder().id(1L).user(user).muscleGroup(muscle).photoUrl(url).capturedAt(date).build();
    }

    private static BodyPhotoRequest request(String muscleGroup, String photoUrl, LocalDate capturedAt) {
        BodyPhotoRequest req = new BodyPhotoRequest();
        req.setMuscleGroup(muscleGroup);
        req.setPhotoUrl(photoUrl);
        req.setCapturedAt(capturedAt);
        return req;
    }

    @Test
    void save_usuarioValido_criaFotoVinculadaAoUsuario() {
        BodyPhotoRequest req = request("Peitoral", "https://blob/a.jpg", LocalDate.of(2026, 9, 5));
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));
        when(bodyPhotoRepository.save(any(BodyPhoto.class))).thenAnswer(inv -> {
            BodyPhoto p = inv.getArgument(0);
            p.setId(10L);
            return p;
        });

        BodyPhotoDto dto = bodyPhotoService.save("ana@test.com", req);

        assertThat(dto.getId()).isEqualTo(10L);
        assertThat(dto.getMuscleGroup()).isEqualTo("Peitoral");
        assertThat(dto.getPhotoUrl()).isEqualTo("https://blob/a.jpg");
        assertThat(dto.getCapturedAt()).isEqualTo(LocalDate.of(2026, 9, 5));

        ArgumentCaptor<BodyPhoto> captor = ArgumentCaptor.forClass(BodyPhoto.class);
        verify(bodyPhotoRepository).save(captor.capture());
        assertThat(captor.getValue().getUser()).isEqualTo(user);
    }

    @Test
    void save_removeEspacoNaPontaDoGrupoMuscular() {
        BodyPhotoRequest req = request("  Peitoral  ", "https://blob/a.jpg", LocalDate.now());
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));
        when(bodyPhotoRepository.save(any(BodyPhoto.class))).thenAnswer(inv -> inv.getArgument(0));

        bodyPhotoService.save("ana@test.com", req);

        ArgumentCaptor<BodyPhoto> captor = ArgumentCaptor.forClass(BodyPhoto.class);
        verify(bodyPhotoRepository).save(captor.capture());
        assertThat(captor.getValue().getMuscleGroup()).isEqualTo("Peitoral");
    }

    @Test
    void save_usuarioNaoEncontrado_lancaExcecao() {
        BodyPhotoRequest req = request("Costas", "https://blob/b.jpg", LocalDate.now());
        when(userRepository.findByEmail("fantasma@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bodyPhotoService.save("fantasma@test.com", req))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(bodyPhotoRepository, never()).save(any());
    }

    @Test
    void list_semFiltro_devolveTodasAsFotosDoUsuario() {
        when(bodyPhotoRepository.findAllByUserEmailOrderByCapturedAtDesc("ana@test.com"))
                .thenReturn(List.of(
                        photo("Pernas", "https://blob/pernas.jpg", LocalDate.of(2026, 9, 5)),
                        photo("Peitoral", "https://blob/peito.jpg", LocalDate.of(2026, 9, 1))
                ));

        List<BodyPhotoDto> result = bodyPhotoService.list("ana@test.com", null);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getMuscleGroup()).isEqualTo("Pernas");
        verify(bodyPhotoRepository, never()).findAllByUserEmailAndMuscleGroupIgnoreCaseOrderByCapturedAtDesc(any(), any());
    }

    @Test
    void list_comFiltroDeGrupo_delegaParaQueryFiltrada() {
        when(bodyPhotoRepository.findAllByUserEmailAndMuscleGroupIgnoreCaseOrderByCapturedAtDesc("ana@test.com", "Pernas"))
                .thenReturn(List.of(photo("Pernas", "https://blob/pernas.jpg", LocalDate.of(2026, 9, 5))));

        List<BodyPhotoDto> result = bodyPhotoService.list("ana@test.com", "Pernas");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMuscleGroup()).isEqualTo("Pernas");
        verify(bodyPhotoRepository, never()).findAllByUserEmailOrderByCapturedAtDesc(any());
    }

    @Test
    void delete_fotoDoProprioUsuario_apaga() {
        BodyPhoto existing = photo("Pernas", "https://blob/pernas.jpg", LocalDate.now());
        when(bodyPhotoRepository.findByIdAndUserEmail(1L, "ana@test.com")).thenReturn(Optional.of(existing));

        bodyPhotoService.delete(1L, "ana@test.com");

        verify(bodyPhotoRepository).delete(existing);
    }

    @Test
    void delete_fotoNaoEncontradaOuDeOutroUsuario_lancaExcecao() {
        when(bodyPhotoRepository.findByIdAndUserEmail(1L, "ana@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bodyPhotoService.delete(1L, "ana@test.com"))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(bodyPhotoRepository, never()).delete(any());
    }
}
