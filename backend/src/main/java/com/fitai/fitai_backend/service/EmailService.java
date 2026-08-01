package com.fitai.fitai_backend.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.net.http.HttpResponse;

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final SendGridClient sendGridClient;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    // Assíncrono para que forgotPassword() responda no mesmo tempo tanto quando o
    // e-mail existe (grava + dispara este envio) quanto quando não existe (só loga) —
    // sem isso, a latência do envio de e-mail vira um canal de timing que denuncia
    // quais e-mails estão cadastrados.
    @Async
    public void sendPasswordResetEmail(String to, String token) {
        String link = frontendUrl + "/reset-senha?token=" + token;
        String text = """
                Recebemos uma solicitação para redefinir sua senha.

                Clique no link abaixo para escolher uma nova senha (válido por 30 minutos):
                %s

                Se você não solicitou isso, pode ignorar este e-mail.
                """.formatted(link);

        try {
            HttpResponse<String> response = sendGridClient.send(to, "Redefinição de senha — FitAI", text);
            if (response.statusCode() >= 300) {
                log.error("SendGrid recusou o envio do e-mail de reset (status {}): {}", response.statusCode(), response.body());
                return;
            }
            log.info("E-mail de reset de senha enviado via SendGrid: to={}", to);
        } catch (Exception e) {
            log.error("Falha ao enviar e-mail de reset via SendGrid: to={}, erro={}", to, e.getMessage());
        }
    }
}
