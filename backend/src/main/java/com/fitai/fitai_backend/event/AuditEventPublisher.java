package com.fitai.fitai_backend.event;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

// Auditoria é best-effort: nenhuma falha de publicação no Kafka (broker fora do ar,
// credenciais ainda não configuradas) pode quebrar o fluxo principal (login, criação
// de treino, etc.) — por isso toda exceção, síncrona ou assíncrona, é só logada aqui.
@Service
@RequiredArgsConstructor
public class AuditEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(AuditEventPublisher.class);

    private final KafkaTemplate<String, AuditEvent> kafkaTemplate;

    @Value("${app.kafka.audit-topic}")
    private String topic;

    public void publish(String eventType, String userEmail, Map<String, Object> details) {
        AuditEvent event = new AuditEvent(eventType, userEmail, Instant.now(), details);
        try {
            kafkaTemplate.send(topic, userEmail, event).whenComplete((result, ex) -> {
                if (ex != null) {
                    log.warn("Falha ao publicar evento de auditoria '{}': {}", eventType, ex.getMessage());
                }
            });
        } catch (Exception e) {
            log.warn("Falha ao publicar evento de auditoria '{}': {}", eventType, e.getMessage());
        }
    }
}
