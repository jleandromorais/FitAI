package com.fitai.fitai_backend.service;

import com.fitai.fitai_backend.dto.BodyWeightGoalDto;
import com.fitai.fitai_backend.dto.BodyWeightGoalRequest;
import com.fitai.fitai_backend.exception.ResourceNotFoundException;
import com.fitai.fitai_backend.model.BodyMeasurement;
import com.fitai.fitai_backend.model.BodyWeightGoal;
import com.fitai.fitai_backend.model.User;
import com.fitai.fitai_backend.repository.BodyMeasurementRepository;
import com.fitai.fitai_backend.repository.BodyWeightGoalRepository;
import com.fitai.fitai_backend.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * O coração da feature: a regra de "meta atingida" vive só no helper puro
 * evaluate(goal, measurementsAsc) e é sempre derivada do histórico real —
 * nunca gravada. Estes testes exercitam evaluate diretamente; o isolamento
 * REAL entre usuários é provado em BodyWeightGoalControllerIT (H2, não mock).
 */
@ExtendWith(MockitoExtension.class)
class BodyWeightGoalServiceTest {

    @Mock BodyWeightGoalRepository bodyWeightGoalRepository;
    @Mock BodyMeasurementRepository bodyMeasurementRepository;
    @Mock UserRepository userRepository;

    @InjectMocks BodyWeightGoalService service;

    private static Instant utc(String isoDate) {
        return LocalDate.parse(isoDate).atStartOfDay(ZoneOffset.UTC).toInstant();
    }

    private static BodyWeightGoal goal(double target, String createdAtDate) {
        return BodyWeightGoal.builder()
                .id(1L).targetWeightKg(target).targetDate(null)
                .createdAt(utc(createdAtDate))
                .build();
    }

    private static BodyMeasurement m(String date, double weight) {
        return BodyMeasurement.builder().measuredAt(LocalDate.parse(date)).weightKg(weight).build();
    }

    // ── evaluate: dado insuficiente ──────────────────────────────────────────

    @Test
    void evaluate_semNenhumaMedida_soCamposCrus() {
        BodyWeightGoalDto dto = service.evaluate(goal(75, "2026-09-05"), List.of());

        assertThat(dto.getTargetWeightKg()).isEqualTo(75.0);
        assertThat(dto.getStartWeightKg()).isNull();
        assertThat(dto.getCurrentWeightKg()).isNull();
        assertThat(dto.getDirection()).isNull();
        assertThat(dto.isAchieved()).isFalse();
        assertThat(dto.getAchievedOn()).isNull();
    }

    // ── evaluate: cutting ───────────────────────────────────────────────────

    @Test
    void evaluate_cutting_aindaLonge_naoAtingida() {
        List<BodyMeasurement> asc = List.of(m("2026-09-05", 82.0), m("2026-10-01", 80.5));

        BodyWeightGoalDto dto = service.evaluate(goal(75, "2026-09-05"), asc);

        assertThat(dto.getStartWeightKg()).isEqualTo(82.0);
        assertThat(dto.getCurrentWeightKg()).isEqualTo(80.5);
        assertThat(dto.getDirection()).isEqualTo("cut");
        assertThat(dto.isAchieved()).isFalse();
        assertThat(dto.getAchievedOn()).isNull();
    }

    @Test
    void evaluate_cutting_medidaCruzaOAlvo_atingidaNaPrimeiraQueCruza() {
        List<BodyMeasurement> asc = List.of(
                m("2026-09-05", 82.0),
                m("2026-10-20", 76.0),
                m("2026-11-20", 74.8),   // 1ª <= 75
                m("2026-12-10", 73.1)
        );

        BodyWeightGoalDto dto = service.evaluate(goal(75, "2026-09-05"), asc);

        assertThat(dto.getDirection()).isEqualTo("cut");
        assertThat(dto.isAchieved()).isTrue();
        assertThat(dto.getAchievedOn()).isEqualTo(LocalDate.parse("2026-11-20"));
        assertThat(dto.getCurrentWeightKg()).isEqualTo(73.1);
    }

    @Test
    void evaluate_apagarAMedidaQueAtingiu_voltaANaoAtingida() {
        List<BodyMeasurement> semACruzadora = List.of(m("2026-09-05", 82.0), m("2026-10-20", 76.0));

        BodyWeightGoalDto dto = service.evaluate(goal(75, "2026-09-05"), semACruzadora);

        assertThat(dto.isAchieved()).isFalse();
        assertThat(dto.getAchievedOn()).isNull();
        assertThat(dto.getCurrentWeightKg()).isEqualTo(76.0);
    }

    // ── evaluate: bulking ──────────────────────────────────────────────────

    @Test
    void evaluate_bulking_medidaCruzaOAlvo_atingida() {
        List<BodyMeasurement> asc = List.of(m("2026-09-05", 70.0), m("2026-11-01", 78.1));

        BodyWeightGoalDto dto = service.evaluate(goal(78, "2026-09-05"), asc);

        assertThat(dto.getDirection()).isEqualTo("bulk");
        assertThat(dto.isAchieved()).isTrue();
        assertThat(dto.getAchievedOn()).isEqualTo(LocalDate.parse("2026-11-01"));
    }

    @Test
    void evaluate_bulking_aindaLonge_naoAtingida() {
        List<BodyMeasurement> asc = List.of(m("2026-09-05", 70.0), m("2026-11-01", 72.4));

        BodyWeightGoalDto dto = service.evaluate(goal(78, "2026-09-05"), asc);

        assertThat(dto.getDirection()).isEqualTo("bulk");
        assertThat(dto.isAchieved()).isFalse();
    }

    // ── evaluate: baseline == alvo ─────────────────────────────────────────

    @Test
    void evaluate_baselineIgualAoAlvo_atingidaNaPrimeiraLeitura() {
        List<BodyMeasurement> asc = List.of(m("2026-09-05", 75.0), m("2026-10-01", 75.4));

        BodyWeightGoalDto dto = service.evaluate(goal(75, "2026-09-05"), asc);

        assertThat(dto.getStartWeightKg()).isEqualTo(75.0);
        assertThat(dto.getDirection()).isNull();
        assertThat(dto.isAchieved()).isTrue();
        assertThat(dto.getAchievedOn()).isEqualTo(LocalDate.parse("2026-09-05"));
    }

    // ── evaluate: escolha do baseline (âncora na data de criação) ──────────

    @Test
    void evaluate_baseline_usaMedidaMaisRecenteAteACriacaoDaMeta_naoAPrimeiraDeTodas() {
        // Meta criada em 2026-09-10. Baseline tem que ser 82 (medida de 09-05),
        // não 90 (a 1ª de todas, de 08-01).
        List<BodyMeasurement> asc = List.of(
                m("2026-08-01", 90.0),
                m("2026-09-05", 82.0),
                m("2026-10-01", 80.0)
        );

        BodyWeightGoalDto dto = service.evaluate(goal(75, "2026-09-10"), asc);

        assertThat(dto.getStartWeightKg()).isEqualTo(82.0);
        assertThat(dto.getDirection()).isEqualTo("cut");
    }

    @Test
    void evaluate_metaCriadaAntesDeQualquerMedida_baselineEhAPrimeiraMedida() {
        List<BodyMeasurement> asc = List.of(m("2026-09-05", 82.0), m("2026-10-01", 80.0));

        BodyWeightGoalDto dto = service.evaluate(goal(75, "2026-08-01"), asc);

        assertThat(dto.getStartWeightKg()).isEqualTo(82.0);
    }

    // ── save / delete ─────────────────────────────────────────────────────

    @Test
    void save_metaSemData_vinculaAoUsuarioEDefineCreatedAt() {
        User user = User.builder().id(1L).email("ana@test.com").build();
        when(userRepository.findByEmail("ana@test.com")).thenReturn(Optional.of(user));
        when(bodyWeightGoalRepository.save(any(BodyWeightGoal.class))).thenAnswer(inv -> {
            BodyWeightGoal g = inv.getArgument(0);
            g.setId(9L);
            return g;
        });
        when(bodyMeasurementRepository.findAllByUserEmailOrderByMeasuredAtDesc("ana@test.com"))
                .thenReturn(new ArrayList<>());

        BodyWeightGoalRequest req = new BodyWeightGoalRequest();
        req.setTargetWeightKg(75.0);

        BodyWeightGoalDto dto = service.save("ana@test.com", req);

        assertThat(dto.getId()).isEqualTo(9L);
        assertThat(dto.getTargetWeightKg()).isEqualTo(75.0);
        assertThat(dto.getCreatedAt()).isNotNull();
        assertThat(dto.isAchieved()).isFalse();
    }

    @Test
    void delete_metaDeOutroUsuarioOuInexistente_lancaExcecao() {
        when(bodyWeightGoalRepository.findByIdAndUserEmail(1L, "ana@test.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete("ana@test.com", 1L))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(bodyWeightGoalRepository, never()).delete(any());
    }
}
