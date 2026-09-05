package com.fitai.fitai_backend.event;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

// Única fuga deliberada do padrão fire-and-forget do AuditEventPublisher: aqui
// a falha de publish precisa ser visível pro chamador (não é auditoria, é o
// próprio pedido de geração do usuário) — por isso o método bloqueia
// brevemente no future e devolve um boolean de sucesso, em vez de só logar e
// seguir. O chamador (WorkoutGenerationService.enqueue) usa esse boolean pra
// marcar o job FAILED na hora se a publicação falhar, em vez de deixá-lo
// pendurado em PENDING pra sempre.
@Service
@RequiredArgsConstructor
public class WorkoutGenerationEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(WorkoutGenerationEventPublisher.class);

    private final KafkaTemplate<String, WorkoutGenerationRequestedEvent> kafkaTemplate;

    @Value("${app.kafka.workout-generation-requested-topic}")
    private String topic;

    public boolean publish(WorkoutGenerationRequestedEvent event) {
        String key = String.valueOf(event.jobId());
        try {
            kafkaTemplate.send(topic, key, event).get(5, TimeUnit.SECONDS);
            return true;
        } catch (TimeoutException e) {
            log.warn("Timeout ao publicar pedido de geração de treino: jobId={}", event.jobId());
            return false;
        } catch (ExecutionException e) {
            log.warn("Falha ao publicar pedido de geração de treino: jobId={}, erro={}", event.jobId(), e.getCause() != null ? e.getCause().getMessage() : e.getMessage());
            return false;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("Publicação de pedido de geração de treino interrompida: jobId={}", event.jobId());
            return false;
        } catch (Exception e) {
            log.warn("Erro inesperado ao publicar pedido de geração de treino: jobId={}, erro={}", event.jobId(), e.getMessage());
            return false;
        }
    }
}
