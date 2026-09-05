package com.fitai.fitai_backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
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
 * Fluxo completo de fotos de evolução ponta a ponta: salvar autenticado,
 * listar (com e sem filtro de grupo), apagar, e confirmar isolamento real
 * entre usuários — com o repository de verdade (H2), não mockado, ao
 * contrário de BodyPhotoServiceTest.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:body_photo_it_testdb;DB_CLOSE_DELAY=-1",
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
class BodyPhotoControllerIT {

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
        String registerJson = objectMapper.writeValueAsString(Map.of("name", "User IT", "email", email, "password", "senha123"));
        String response = mockMvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(registerJson))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("token").asText();
    }

    private String photoJson(String muscleGroup, String photoUrl, String capturedAt) {
        return """
                { "muscleGroup": "%s", "photoUrl": "%s", "capturedAt": "%s" }
                """.formatted(muscleGroup, photoUrl, capturedAt);
    }

    @Test
    void salvarListarEApagar_fluxoCompleto() throws Exception {
        String token = registerAndLogin("photo-it-" + UUID.randomUUID() + "@test.com");

        String createResponse = mockMvc.perform(post("/body-photos")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(photoJson("Peitoral", "https://blob.vercel-storage.com/a.jpg", "2026-09-01")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.muscleGroup").value("Peitoral"))
                .andReturn().getResponse().getContentAsString();
        long photoId = objectMapper.readTree(createResponse).get("id").asLong();

        mockMvc.perform(post("/body-photos")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(photoJson("Pernas", "https://blob.vercel-storage.com/b.jpg", "2026-09-02")))
                .andExpect(status().isCreated());

        // Lista tudo
        mockMvc.perform(get("/body-photos").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));

        // Filtro por grupo, case-insensitive
        mockMvc.perform(get("/body-photos").param("muscleGroup", "peitoral").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].muscleGroup").value("Peitoral"));

        // Apaga uma
        mockMvc.perform(delete("/body-photos/" + photoId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/body-photos").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void isolamentoEntreUsuarios_usuarioNaoVeNemApagaFotoDeOutro() throws Exception {
        String tokenA = registerAndLogin("photo-a-" + UUID.randomUUID() + "@test.com");
        String tokenB = registerAndLogin("photo-b-" + UUID.randomUUID() + "@test.com");

        String createResponse = mockMvc.perform(post("/body-photos")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(photoJson("Costas", "https://blob.vercel-storage.com/c.jpg", "2026-09-01")))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        long photoId = objectMapper.readTree(createResponse).get("id").asLong();

        // B não vê a foto de A na própria listagem
        mockMvc.perform(get("/body-photos").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // B não consegue apagar a foto de A (404, não 403 — mesmo padrão de Workout)
        mockMvc.perform(delete("/body-photos/" + photoId).header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        // A continua vendo a própria foto normalmente
        mockMvc.perform(get("/body-photos").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void semAutenticacao_retorna403() throws Exception {
        // Sem AuthenticationEntryPoint customizado, o Spring Security deste
        // projeto responde 403 (não 401) pra requisição sem token — mesmo
        // comportamento confirmado em AuthControllerIT.
        mockMvc.perform(get("/body-photos"))
                .andExpect(status().isForbidden());
    }

    @Test
    void photoUrlComEsquemaNaoHttps_retorna400() throws Exception {
        String token = registerAndLogin("photo-invalid-" + UUID.randomUUID() + "@test.com");

        mockMvc.perform(post("/body-photos")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(photoJson("Peitoral", "javascript:alert(1)", "2026-09-01")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void capturedAtNoFuturo_retorna400() throws Exception {
        String token = registerAndLogin("photo-future-" + UUID.randomUUID() + "@test.com");

        mockMvc.perform(post("/body-photos")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(photoJson("Peitoral", "https://blob.vercel-storage.com/a.jpg", "2099-01-01")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void muscleGroupEmBranco_retorna400() throws Exception {
        String token = registerAndLogin("photo-blank-" + UUID.randomUUID() + "@test.com");

        mockMvc.perform(post("/body-photos")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(photoJson("", "https://blob.vercel-storage.com/a.jpg", "2026-09-01")))
                .andExpect(status().isBadRequest());
    }
}
