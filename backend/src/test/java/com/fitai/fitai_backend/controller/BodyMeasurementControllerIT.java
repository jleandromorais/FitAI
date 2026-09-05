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
 * Medidas corporais ponta a ponta com o repository de verdade (H2): salvar,
 * listar ordenado, apagar, isolamento real entre usuários, e os 400s de
 * validação da matriz. Sem token → 403 (mesmo comportamento de
 * BodyPhotoControllerIT — este projeto não tem AuthenticationEntryPoint
 * customizado que troque pra 401).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:body_measurement_it_testdb;DB_CLOSE_DELAY=-1",
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
class BodyMeasurementControllerIT {

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

    // ── Fluxo completo ──────────────────────────────────────────────────────

    @Test
    void salvarListarEApagar_fluxoCompleto() throws Exception {
        String token = registerAndLogin(uniqueEmail("measure-it"));

        String created = mockMvc.perform(post("/body-measurements")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "weightKg": 82.4, "heightCm": 178, "bodyFatPct": 18.5, "measuredAt": "2026-09-01" }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.weightKg").value(82.4))
                .andExpect(jsonPath("$.heightCm").value(178.0))
                .andReturn().getResponse().getContentAsString();
        long id = objectMapper.readTree(created).get("id").asLong();

        mockMvc.perform(post("/body-measurements")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "weightKg": 81.0, "measuredAt": "2026-09-03" }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.heightCm").doesNotExist());

        // Mais recente primeiro
        mockMvc.perform(get("/body-measurements").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].measuredAt").value("2026-09-03"))
                .andExpect(jsonPath("$[1].measuredAt").value("2026-09-01"));

        mockMvc.perform(delete("/body-measurements/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/body-measurements").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void isolamentoEntreUsuarios_naoVeNemApagaMedidaDeOutro() throws Exception {
        String tokenA = registerAndLogin(uniqueEmail("measure-a"));
        String tokenB = registerAndLogin(uniqueEmail("measure-b"));

        String created = mockMvc.perform(post("/body-measurements")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "weightKg": 90.0, "measuredAt": "2026-09-01" }
                                """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long id = objectMapper.readTree(created).get("id").asLong();

        mockMvc.perform(get("/body-measurements").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // 404, não 403 — indistinguível de "não existe", mesmo padrão de Workout
        mockMvc.perform(delete("/body-measurements/" + id).header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/body-measurements").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // ── Auth ───────────────────────────────────────────────────────────────

    @Test
    void semAutenticacao_retorna403() throws Exception {
        mockMvc.perform(get("/body-measurements")).andExpect(status().isForbidden());
    }

    // ── Validação (matriz) ─────────────────────────────────────────────────

    @Test
    void weightKgAusente_retorna400() throws Exception {
        String token = registerAndLogin(uniqueEmail("measure-noweight"));
        mockMvc.perform(post("/body-measurements")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "measuredAt": "2026-09-01" }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void weightKgForaDaFaixa_retorna400() throws Exception {
        String token = registerAndLogin(uniqueEmail("measure-range"));
        for (String w : new String[]{"0", "700"}) {
            mockMvc.perform(post("/body-measurements")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{ \"weightKg\": " + w + ", \"measuredAt\": \"2026-09-01\" }"))
                    .andExpect(status().isBadRequest());
        }
    }

    @Test
    void heightCmForaDaFaixa_retorna400() throws Exception {
        String token = registerAndLogin(uniqueEmail("measure-height"));
        mockMvc.perform(post("/body-measurements")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "weightKg": 80, "heightCm": 30, "measuredAt": "2026-09-01" }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void bodyFatPctForaDaFaixa_retorna400() throws Exception {
        String token = registerAndLogin(uniqueEmail("measure-bf"));
        mockMvc.perform(post("/body-measurements")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "weightKg": 80, "bodyFatPct": 90, "measuredAt": "2026-09-01" }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void measuredAtNoFuturo_retorna400() throws Exception {
        String token = registerAndLogin(uniqueEmail("measure-future"));
        mockMvc.perform(post("/body-measurements")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                { "weightKg": 80, "measuredAt": "2099-01-01" }
                                """))
                .andExpect(status().isBadRequest());
    }
}
