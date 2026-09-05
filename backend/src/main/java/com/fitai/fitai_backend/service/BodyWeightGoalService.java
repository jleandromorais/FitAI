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
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BodyWeightGoalService {

    private static final Logger log = LoggerFactory.getLogger(BodyWeightGoalService.class);

    private final BodyWeightGoalRepository bodyWeightGoalRepository;
    private final BodyMeasurementRepository bodyMeasurementRepository;
    private final UserRepository userRepository;

    @Transactional
    public BodyWeightGoalDto save(String email, BodyWeightGoalRequest req) {
        log.info("Salvando meta de peso: email={}, targetWeightKg={}", email, req.getTargetWeightKg());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário não encontrado."));

        BodyWeightGoal goal = BodyWeightGoal.builder()
                .user(user)
                .targetWeightKg(req.getTargetWeightKg())
                .targetDate(req.getTargetDate())
                .createdAt(Instant.now())
                .build();

        BodyWeightGoal saved = bodyWeightGoalRepository.save(goal);
        // measurementsAsc vazio no momento da criação é o caso comum — evaluate
        // devolve o DTO "cru" (sem derivados) sem estourar.
        return evaluate(saved, measurementsAsc(email));
    }

    public List<BodyWeightGoalDto> list(String email) {
        List<BodyMeasurement> measurementsAsc = measurementsAsc(email);
        return bodyWeightGoalRepository.findAllByUserEmailOrderByCreatedAtDesc(email)
                .stream().map(goal -> evaluate(goal, measurementsAsc)).toList();
    }

    @Transactional
    public void delete(String email, Long id) {
        log.info("Deletando meta de peso: id={}, email={}", id, email);
        BodyWeightGoal goal = bodyWeightGoalRepository.findByIdAndUserEmail(id, email)
                .orElseThrow(() -> new ResourceNotFoundException("Meta não encontrada."));
        bodyWeightGoalRepository.delete(goal);
    }

    private List<BodyMeasurement> measurementsAsc(String email) {
        List<BodyMeasurement> desc = bodyMeasurementRepository.findAllByUserEmailOrderByMeasuredAtDesc(email);
        List<BodyMeasurement> asc = new ArrayList<>(desc);
        java.util.Collections.reverse(asc);
        return asc;
    }

    /**
     * Deriva o DTO enriquecido de uma meta a partir do histórico de medidas do
     * usuário (ordenado por data crescente). Função pura, sem I/O — todo o
     * raciocínio de "meta atingida" mora aqui, testável isoladamente, e NUNCA
     * é gravado. Ver DESIGN.md, "A Regra da Honestidade do Painel".
     *
     * <ul>
     *   <li>Sem nenhuma medida: só os campos crus, derivados nulos/false — a
     *       regra de "dado insuficiente" tem prioridade sobre tudo.</li>
     *   <li>Baseline: peso da medida mais recente com data &le; criação da meta;
     *       se não houver nenhuma até lá, a 1ª medida de todas.</li>
     *   <li>Direção: alvo &lt; baseline → "cut"; alvo &gt; baseline → "bulk";
     *       alvo == baseline → sem direção, atingida na hora.</li>
     *   <li>Atingida: 1ª medida (menor data) cujo peso cruza o alvo no sentido
     *       da direção. achievedOn = a data dessa medida.</li>
     * </ul>
     */
    BodyWeightGoalDto evaluate(BodyWeightGoal goal, List<BodyMeasurement> measurementsAsc) {
        BodyWeightGoalDto.BodyWeightGoalDtoBuilder dto = BodyWeightGoalDto.builder()
                .id(goal.getId())
                .targetWeightKg(goal.getTargetWeightKg())
                .targetDate(goal.getTargetDate())
                .createdAt(goal.getCreatedAt())
                .startWeightKg(null)
                .currentWeightKg(null)
                .direction(null)
                .achieved(false)
                .achievedOn(null);

        if (measurementsAsc == null || measurementsAsc.isEmpty()) {
            return dto.build();
        }

        double target = goal.getTargetWeightKg();
        double current = measurementsAsc.get(measurementsAsc.size() - 1).getWeightKg();
        double baseline = baselineWeight(goal, measurementsAsc);

        dto.startWeightKg(baseline).currentWeightKg(current);

        if (target == baseline) {
            // Baseline já está no alvo: atingida na 1ª leitura. achievedOn = a
            // 1ª medida que bate exatamente o alvo (fallback: data do baseline).
            LocalDate on = firstCrossing(measurementsAsc, m -> m.getWeightKg() == target);
            return dto.achieved(true)
                    .achievedOn(on != null ? on : baselineDate(goal, measurementsAsc))
                    .build();
        }

        boolean cutting = target < baseline;
        dto.direction(cutting ? "cut" : "bulk");

        LocalDate achievedOn = cutting
                ? firstCrossing(measurementsAsc, m -> m.getWeightKg() <= target)
                : firstCrossing(measurementsAsc, m -> m.getWeightKg() >= target);

        return dto.achieved(achievedOn != null).achievedOn(achievedOn).build();
    }

    private static double baselineWeight(BodyWeightGoal goal, List<BodyMeasurement> measurementsAsc) {
        LocalDate goalDate = goal.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate();
        Double onOrBefore = null;
        for (BodyMeasurement m : measurementsAsc) { // asc por data
            if (!m.getMeasuredAt().isAfter(goalDate)) onOrBefore = m.getWeightKg();
        }
        return onOrBefore != null ? onOrBefore : measurementsAsc.get(0).getWeightKg();
    }

    private static LocalDate baselineDate(BodyWeightGoal goal, List<BodyMeasurement> measurementsAsc) {
        LocalDate goalDate = goal.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate onOrBefore = null;
        for (BodyMeasurement m : measurementsAsc) {
            if (!m.getMeasuredAt().isAfter(goalDate)) onOrBefore = m.getMeasuredAt();
        }
        return onOrBefore != null ? onOrBefore : measurementsAsc.get(0).getMeasuredAt();
    }

    private static LocalDate firstCrossing(List<BodyMeasurement> measurementsAsc,
                                           java.util.function.Predicate<BodyMeasurement> crosses) {
        for (BodyMeasurement m : measurementsAsc) { // asc por data → 1ª que casa é a menor data
            if (crosses.test(m)) return m.getMeasuredAt();
        }
        return null;
    }
}
