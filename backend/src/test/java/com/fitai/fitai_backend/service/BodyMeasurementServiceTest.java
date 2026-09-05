package com.fitai.fitai_backend.service;

import com.fitai.fitai_backend.dto.BodyMeasurementDto;
import com.fitai.fitai_backend.dto.BodyMeasurementRequest;
import com.fitai.fitai_backend.exception.ResourceNotFoundException;
import com.fitai.fitai_backend.model.BodyMeasurement;
import com.fitai.fitai_backend.model.User;
import com.fitai.fitai_backend.repository.BodyMeasurementRepository;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BodyMeasurementServiceTest {

    @Mock BodyMeasurementRepository bodyMeasurementRepository;
    @Mock UserRepository            userRepository;

    @InjectMocks BodyMeasurementService service;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder().id(1L).name("Ana").email("ana@test.com").build();
    }

    private static BodyMeasurementRequest request(Double weightKg, Double heightCm, Double bodyFatPct,
                                                  LocalDate measuredAt, String note) {
        BodyMeasurementRequest req = new BodyMeasurementRequest();
        req.setWeightKg(weightKg);
        req.setHeightCm(heightCm);
        req.setBodyFatPct(bodyFatPct);
        req.setMeasuredAt(measuredAt);
        req.setNote(note);
        return req;
    }

    private BodyMeasurement measurement(LocalDate date, double weight) {
        return BodyMeasurement.builder().id(1L).user(user).measuredAt(date).weightKg(weight).build();
    }

    @Test
    void save_medidaMinima_criaLinhaVinculadaAoUsuario_comOpcionaisNulos() {
        BodyMeasurementRequest req = request(82.4, null, null, LocalDate.of(2026, 9, 5), null);
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));
        when(bodyMeasurementRepository.save(any(BodyMeasurement.class))).thenAnswer(inv -> {
            BodyMeasurement m = inv.getArgument(0);
            m.setId(10L);
            return m;
        });

        BodyMeasurementDto dto = service.save("ana@test.com", req);

        assertThat(dto.getId()).isEqualTo(10L);
        assertThat(dto.getWeightKg()).isEqualTo(82.4);
        assertThat(dto.getHeightCm()).isNull();
        assertThat(dto.getBodyFatPct()).isNull();

        ArgumentCaptor<BodyMeasurement> captor = ArgumentCaptor.forClass(BodyMeasurement.class);
        verify(bodyMeasurementRepository).save(captor.capture());
        assertThat(captor.getValue().getUser()).isEqualTo(user);
    }

    @Test
    void save_notaSoComEspacos_viraNull() {
        BodyMeasurementRequest req = request(80.0, null, null, LocalDate.now(), "   ");
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));
        when(bodyMeasurementRepository.save(any(BodyMeasurement.class))).thenAnswer(inv -> inv.getArgument(0));

        service.save("ana@test.com", req);

        ArgumentCaptor<BodyMeasurement> captor = ArgumentCaptor.forClass(BodyMeasurement.class);
        verify(bodyMeasurementRepository).save(captor.capture());
        assertThat(captor.getValue().getNote()).isNull();
    }

    @Test
    void save_usuarioNaoEncontrado_lancaExcecao() {
        BodyMeasurementRequest req = request(80.0, null, null, LocalDate.now(), null);
        when(userRepository.findByEmail("fantasma@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.save("fantasma@test.com", req))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(bodyMeasurementRepository, never()).save(any());
    }

    @Test
    void list_delegaParaQueryOrdenadaPorDataDesc_isoladaPorEmail() {
        when(bodyMeasurementRepository.findAllByUserEmailOrderByMeasuredAtDesc("ana@test.com"))
                .thenReturn(List.of(
                        measurement(LocalDate.of(2026, 9, 5), 82.0),
                        measurement(LocalDate.of(2026, 9, 1), 83.0)
                ));

        List<BodyMeasurementDto> result = service.list("ana@test.com");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getMeasuredAt()).isEqualTo(LocalDate.of(2026, 9, 5));
    }

    @Test
    void delete_medidaDoProprioUsuario_apaga() {
        BodyMeasurement existing = measurement(LocalDate.now(), 80.0);
        when(bodyMeasurementRepository.findByIdAndUserEmail(1L, "ana@test.com")).thenReturn(Optional.of(existing));

        service.delete("ana@test.com", 1L);

        verify(bodyMeasurementRepository).delete(existing);
    }

    @Test
    void delete_medidaNaoEncontradaOuDeOutroUsuario_lancaExcecao() {
        when(bodyMeasurementRepository.findByIdAndUserEmail(1L, "ana@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete("ana@test.com", 1L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(bodyMeasurementRepository, never()).delete(any());
    }
}
