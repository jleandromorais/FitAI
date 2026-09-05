package com.fitai.fitai_backend.listener;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fitai.fitai_backend.event.WorkoutGenerationResultEvent;
import com.fitai.fitai_backend.service.WorkoutGenerationService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

// Consome fitai.workout-generation-result, produzido pelo worker Node.js.
// Payload é String pura (StringDeserializer dos dois lados) — desserializado
// manualmente aqui em vez de configurar trusted-packages/type headers do
// JsonDeserializer do Spring só pra atravessar a fronteira Java↔Node
// (mesma decisão documentada no plano). Um JSON malformado nunca pode
// derrubar o container do listener — só é logado e a mensagem é descartada.
@Component
@RequiredArgsConstructor
public class WorkoutGenerationResultListener {

    private static final Logger log = LoggerFactory.getLogger(WorkoutGenerationResultListener.class);

    private final WorkoutGenerationService workoutGenerationService;

    // Instância própria, não injetada — mesmo padrão de SendGridClient/
    // WorkoutGenerationService (o Boot 4 aqui só autoconfigura um ObjectMapper
    // Jackson 3, não este com.fasterxml.jackson Jackson 2). JavaTimeModule
    // registrado à mão pra aceitar o "completedAt" ISO-8601 que o worker Node
    // manda em WorkoutGenerationResultEvent.
    private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());

    @KafkaListener(
            topics = "${app.kafka.workout-generation-result-topic}",
            groupId = "${app.kafka.workout-generation-consumer-group:fitai-backend-workout-results}"
    )
    public void onMessage(String payload) {
        WorkoutGenerationResultEvent event;
        try {
            event = objectMapper.readValue(payload, WorkoutGenerationResultEvent.class);
        } catch (Exception e) {
            log.warn("Falha ao desserializar evento de resultado de geração de treino, mensagem descartada: erro={}, payload={}",
                    e.getMessage(), payload);
            return;
        }

        try {
            workoutGenerationService.handleResult(event);
        } catch (Exception e) {
            // handleResult já não deveria lançar, mas isso garante que nenhuma
            // falha inesperada derrube o container do listener.
            log.warn("Erro inesperado ao processar resultado de geração de treino: jobId={}, erro={}", event.jobId(), e.getMessage());
        }
    }
}
