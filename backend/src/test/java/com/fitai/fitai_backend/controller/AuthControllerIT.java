package com.fitai.fitai_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testa o fluxo completo de autenticação ponta a ponta: registro → login →
 * acesso a endpoint protegido → forgot/reset password → login com senha nova.
 * Usa H2 em memória (schema criado via Hibernate a partir das entidades).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:auth_it_testdb;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.flyway.enabled=false",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "jwt.secret=test-secret-key-with-at-least-32-chars!!",
    "jwt.expiration=86400000",
    "jwt.refresh-expiration=604800000",
    "google.client-id=test-client-id",
    "cors.allowed-origins=http://localhost:3000",
    "spring.mail.host=localhost",
    "spring.mail.port=2525",
    "mail.from=no-reply@fitai.app",
    "app.frontend-url=http://localhost:3000",
})
class AuthControllerIT {

    @Autowired
    private WebApplicationContext context;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private JavaMailSender mailSender;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void fluxoCompleto_registerLoginAcessoProtegidoResetSenha() throws Exception {
        String email = "it-" + UUID.randomUUID() + "@test.com";

        // 1. Registro
        String registerJson = objectMapper.writeValueAsString(Map.of("name", "Ana IT", "email", email, "password", "senha123"));
        mockMvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(registerJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());

        // 2. Login
        String loginJson = objectMapper.writeValueAsString(Map.of("email", email, "password", "senha123"));
        String loginResponse = mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn().getResponse().getContentAsString();

        String accessToken = objectMapper.readTree(loginResponse).get("token").asText();
        assertThat(accessToken).isNotBlank();

        // 3. Acessar endpoint protegido com o JWT emitido
        mockMvc.perform(get("/workouts").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());

        // 3b. Sem token, o mesmo endpoint deve ser recusado (Spring Security retorna 403
        // por não haver um AuthenticationEntryPoint customizado para 401)
        mockMvc.perform(get("/workouts"))
                .andExpect(status().isForbidden());

        // 4. Forgot password — não deve vazar o token na resposta
        String forgotJson = objectMapper.writeValueAsString(Map.of("email", email));
        mockMvc.perform(post("/auth/forgot-password").contentType(MediaType.APPLICATION_JSON).content(forgotJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resetToken").doesNotExist());

        // 5. Capturar o token gerado via o e-mail "enviado" (mock) para poder resetar a senha.
        // O envio agora é assíncrono (@Async), então aguarda a chamada em vez de checar na hora.
        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, timeout(2000)).send(captor.capture());
        String emailBody = captor.getValue().getText();
        String resetToken = emailBody.substring(emailBody.indexOf("token=") + "token=".length()).trim().split("\\s+")[0];
        assertThat(resetToken).isNotBlank();

        // 6. Reset de senha com o token capturado
        String resetJson = objectMapper.writeValueAsString(Map.of("token", resetToken, "newPassword", "novaSenha456"));
        mockMvc.perform(post("/auth/reset-password").contentType(MediaType.APPLICATION_JSON).content(resetJson))
                .andExpect(status().isOk());

        // 7. Login com a senha antiga deve falhar
        mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(loginJson))
                .andExpect(status().isUnauthorized());

        // 8. Login com a senha nova deve funcionar
        String newLoginJson = objectMapper.writeValueAsString(Map.of("email", email, "password", "novaSenha456"));
        mockMvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(newLoginJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void forgotPassword_emailInexistente_retorna200SemVazarInformacao() throws Exception {
        String forgotJson = objectMapper.writeValueAsString(Map.of("email", "nao-existe-" + UUID.randomUUID() + "@test.com"));

        mockMvc.perform(post("/auth/forgot-password").contentType(MediaType.APPLICATION_JSON).content(forgotJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resetToken").doesNotExist());

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }
}
