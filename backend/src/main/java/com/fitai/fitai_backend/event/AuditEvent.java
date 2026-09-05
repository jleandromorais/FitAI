package com.fitai.fitai_backend.event;

import java.time.Instant;
import java.util.Map;

// Um único formato de evento pra todo o tópico de auditoria — login, treino criado,
// sessão registrada, etc. "details" carrega o que for específico de cada tipo de evento.
public record AuditEvent(
        String eventType,
        String userEmail,
        Instant occurredAt,
        Map<String, Object> details
) {
}
