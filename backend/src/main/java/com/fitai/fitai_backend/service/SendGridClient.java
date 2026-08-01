package com.fitai.fitai_backend.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

// Cliente fino para a API HTTPS da SendGrid (sendgrid.com). Usamos HTTP em vez de
// SMTP puro porque várias plataformas de deploy (Railway incluída) bloqueiam
// conexões de saída nas portas SMTP (25/465/587) para conter abuso — HTTPS nunca é bloqueado.
// SendGrid permite verificar um único endereço de e-mail como remetente (Single Sender
// Verification), sem precisar de um domínio próprio — diferente da Resend, que exige domínio.
// Isolado num componente próprio (em vez de embutido no EmailService) para que
// os testes possam mockar só a chamada de rede, sem depender de infraestrutura real.
@Component
public class SendGridClient {

    private static final URI SENDGRID_ENDPOINT = URI.create("https://api.sendgrid.com/v3/mail/send");

    // Instância própria, não injetada — só usada aqui pra montar um payload JSON
    // simples, sem depender de como o Jackson do resto da app está configurado.
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    @Value("${sendgrid.api-key}")
    private String apiKey;

    @Value("${sendgrid.from}")
    private String from;

    public HttpResponse<String> send(String to, String subject, String text) throws Exception {
        String body = objectMapper.writeValueAsString(Map.of(
                "personalizations", List.of(Map.of("to", List.of(Map.of("email", to)))),
                "from", Map.of("email", from),
                "subject", subject,
                "content", List.of(Map.of("type", "text/plain", "value", text))
        ));

        HttpRequest request = HttpRequest.newBuilder(SENDGRID_ENDPOINT)
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(15))
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
    }
}
