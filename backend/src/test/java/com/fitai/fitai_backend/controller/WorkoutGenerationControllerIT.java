package com.fitai.fitai_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitai.fitai_backend.event.WorkoutGenerationEventPublisher;
import com.fitai.fitai_backend.service.SendGridClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Fluxo completo de geração assíncrona de treino ponta a ponta: enqueue
 * (201/202), status via polling, isolamento entre usuários e falha de
 * publicação Kafka — com o repository/service de verdade (H2), publisher
 * mockado (@MockitoBean) pra nunca depender de um Kafka real, mesmo padrão de
 * BodyPhotoControllerIT.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:workout_generation_it_testdb;DB_CLOSE_DELAY=-1",
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
    "sendgrid.api-key=test-key",
    "sendgrid.from=no-reply@fitai.app",
    "app.frontend-url=http://localhost:3000",
})
class WorkoutGenerationControllerIT {

    @Autowired
    private WebApplicationContext context;

    @MockitoBean
    private SendGridClient sendGridClient;

    @MockitoBean
    private WorkoutGenerationEventPublisher eventPublisher;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    private String registerAndLogin(String email) throws Exception {
        String registerJson = objectMapper.writeValueAsString(Map.of("name", "User IT", "email", email, "password", "senha123"));
        String response = mockMvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(registerJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asText();
    }

    private String generationRequestJson() {
        return """
                { "level": "Iniciante", "goal": "Hipertrofia", "days": "3 dias", "equipment": "Apenas peso corporal", "duration": "30 min" }
                """;
    }

    @Test
    void enqueue_publicacaoComSucesso_retorna202ComStatusPending() throws Exception {
        when(eventPublisher.publish(any())).thenReturn(true);
        String token = registerAndLogin("gen-ok-" + UUID.randomUUID() + "@test.com");

        mockMvc.perform(post("/workout-generation-jobs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(generationRequestJson()))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.workouts").doesNotExist())
                .andExpect(jsonPath("$.errorMessage").doesNotExist());
    }

    @Test
    void enqueue_publicacaoFalha_retorna202MasJobFicaFailed() throws Exception {
        when(eventPublisher.publish(any())).thenReturn(false);
        String token = registerAndLogin("gen-fail-" + UUID.randomUUID() + "@test.com");

        mockMvc.perform(post("/workout-generation-jobs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(generationRequestJson()))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status").value("FAILED"))
                .andExpect(jsonPath("$.errorMessage").value("Não foi possível iniciar a geração de treino. Tente novamente."));
    }

    @Test
    void getStatus_jobDoProprioUsuario_devolveJob() throws Exception {
        when(eventPublisher.publish(any())).thenReturn(true);
        String token = registerAndLogin("gen-status-" + UUID.randomUUID() + "@test.com");

        String createResponse = mockMvc.perform(post("/workout-generation-jobs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(generationRequestJson()))
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
        long jobId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(get("/workout-generation-jobs/" + jobId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(jobId))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    void getStatus_jobDeOutroUsuario_retorna404() throws Exception {
        when(eventPublisher.publish(any())).thenReturn(true);
        String tokenA = registerAndLogin("gen-a-" + UUID.randomUUID() + "@test.com");
        String tokenB = registerAndLogin("gen-b-" + UUID.randomUUID() + "@test.com");

        String createResponse = mockMvc.perform(post("/workout-generation-jobs")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(generationRequestJson()))
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
        long jobId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(get("/workout-generation-jobs/" + jobId).header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    void semAutenticacao_retorna403() throws Exception {
        // Sem AuthenticationEntryPoint customizado, o Spring Security deste
        // projeto responde 403 (não 401) pra requisição sem token — mesmo
        // comportamento confirmado em BodyPhotoControllerIT/AuthControllerIT.
        mockMvc.perform(get("/workout-generation-jobs/1"))
                .andExpect(status().isForbidden());
    }
}
