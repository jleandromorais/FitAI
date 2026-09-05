package com.fitai.fitai_backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
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

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Prova ponta a ponta (H2 real) de que "meta atingida" é DERIVADA das medidas
 * na leitura, nunca gravada: a mesma meta responde achieved=true depois de uma
 * medida cruzar o alvo e volta a achieved=false quando essa medida é apagada,
 * sem nenhum PATCH/PUT na meta. Mais isolamento real entre usuários.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:body_goal_it_testdb;DB_CLOSE_DELAY=-1",
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
class BodyWeightGoalControllerIT {

    @Autowired
    private WebApplicationContext context;

    @MockitoBean
    private SendGridClient sendGridClient;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    private String registerAndLogin(String email) throws Exception {
        String registerJson = objectMapper.writeValueAsString(
                Map.of("name", "User IT", "email", email, "password", "senha123"));
        String response = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON).content(registerJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asText();
    }

    private String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@test.com";
    }

    private long postMeasurement(String token, String body) throws Exception {
        String res = mockMvc.perform(post("/body-measurements")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(res).get("id").asLong();
    }

    @Test
    void metaSemMedidas_derivadosVemNulos() throws Exception {
        String token = registerAndLogin(uniqueEmail("goal-empty"));

        mockMvc.perform(post("/body-weight-goals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "targetWeightKg": 75 }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.startWeightKg").doesNotExist())
                .andExpect(jsonPath("$.currentWeightKg").doesNotExist())
                .andExpect(jsonPath("$.achieved").value(false));
    }

    @Test
    void atingida_ehDerivadaNaLeitura_eVoltaAtrasQuandoAMedidaEApagada() throws Exception {
        String token = registerAndLogin(uniqueEmail("goal-derive"));

        // Peso inicial bem acima do alvo, antes da meta.
        postMeasurement(token, "{ \"weightKg\": 82.0, \"measuredAt\": \"2026-09-01\" }");

        long goalId = objectMapper.readTree(mockMvc.perform(post("/body-weight-goals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"targetWeightKg\": 75 }"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.achieved").value(false))
                .andReturn().getResponse().getContentAsString()).get("id").asLong();

        // Ainda longe.
        mockMvc.perform(get("/body-weight-goals").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value((int) goalId))
                .andExpect(jsonPath("$[0].achieved").value(false))
                .andExpect(jsonPath("$[0].currentWeightKg").value(82.0));

        // Uma medida cruza o alvo.
        long crossingId = postMeasurement(token, "{ \"weightKg\": 74.5, \"measuredAt\": \"2026-09-03\" }");

        mockMvc.perform(get("/body-weight-goals").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].achieved").value(true))
                .andExpect(jsonPath("$[0].currentWeightKg").value(74.5));

        // Apaga a medida que cruzou → a MESMA meta volta a não-atingida.
        mockMvc.perform(delete("/body-measurements/" + crossingId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/body-weight-goals").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].achieved").value(false))
                .andExpect(jsonPath("$[0].currentWeightKg").value(82.0));
    }

    @Test
    void isolamentoEntreUsuarios_naoVeNemApagaMetaDeOutro() throws Exception {
        String tokenA = registerAndLogin(uniqueEmail("goal-a"));
        String tokenB = registerAndLogin(uniqueEmail("goal-b"));

        long goalId = objectMapper.readTree(mockMvc.perform(post("/body-weight-goals")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"targetWeightKg\": 75 }"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/body-weight-goals").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(delete("/body-weight-goals/" + goalId).header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/body-weight-goals").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void semAutenticacao_retorna403() throws Exception {
        mockMvc.perform(get("/body-weight-goals")).andExpect(status().isForbidden());
    }

    @Test
    void targetWeightKgForaDaFaixa_retorna400() throws Exception {
        String token = registerAndLogin(uniqueEmail("goal-range"));
        mockMvc.perform(post("/body-weight-goals")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"targetWeightKg\": 5 }"))
                .andExpect(status().isBadRequest());
    }
}
