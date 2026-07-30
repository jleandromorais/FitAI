package com.fitai.fitai_backend.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${mail.from}")
    private String from;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    // Assíncrono para que forgotPassword() responda no mesmo tempo tanto quando o
    // e-mail existe (grava + dispara este envio) quanto quando não existe (só loga) —
    // sem isso, a latência do envio de e-mail vira um canal de timing que denuncia
    // quais e-mails estão cadastrados.
    @Async
    public void sendPasswordResetEmail(String to, String token) {
        String link = frontendUrl + "/reset-senha?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("Redefinição de senha — FitAI");
        message.setText("""
                Recebemos uma solicitação para redefinir sua senha.

                Clique no link abaixo para escolher uma nova senha (válido por 30 minutos):
                %s

                Se você não solicitou isso, pode ignorar este e-mail.
                """.formatted(link));

        mailSender.send(message);
        log.info("E-mail de reset de senha enviado: to={}", to);
    }
}
