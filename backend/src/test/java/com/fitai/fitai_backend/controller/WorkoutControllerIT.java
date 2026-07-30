package com.fitai.fitai_backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Testa o fluxo completo de treinos ponta a ponta: criar treino autenticado,
 * listar, registrar sessão executada e confirmar isolamento entre usuários
 * (um usuário não pode ver/acessar treino de outro).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@TestPropertySource(properties = {
    "spring.datasource.url=jdbc:h2:mem:workout_it_testdb;DB_CLOSE_DELAY=-1",
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
class WorkoutControllerIT {

    @Autowired
    private WebApplicationContext context;

    @MockitoBean
    private JavaMailSender mailSender;

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

    private String workoutRequestJson(String name, String code) {
        return """
                {
                  "name": "%s",
                  "code": "%s",
                  "schedule": "Seg, Qui",
                  "tags": ["Hipertrofia"],
                  "exercises": [
                    {
                      "name": "Supino Reto",
                      "muscle": "Peitoral",
                      "restSeconds": 90,
                      "sets": [
                        { "reps": 10, "weight": 60, "done": false, "prev": 0 }
                      ]
                    }
                  ]
                }
                """.formatted(name, code);
    }

    @Test
    void criarListarERegistrarSessao_fluxoCompleto() throws Exception {
        String email = "workout-it-" + UUID.randomUUID() + "@test.com";
        String token = registerAndLogin(email);

        // Criar treino
        String createResponse = mockMvc.perform(post("/workouts")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workoutRequestJson("Treino A", "A")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Treino A"))
                .andReturn().getResponse().getContentAsString();

        JsonNode created = objectMapper.readTree(createResponse);
        long workoutId = created.get("id").asLong();
        long exerciseId = created.get("exercises").get(0).get("id").asLong();

        // Listar treinos do usuário
        mockMvc.perform(get("/workouts").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].name").value("Treino A"));

        // Buscar por ID
        mockMvc.perform(get("/workouts/" + workoutId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value("A"));

        // Registrar sessão executada
        String sessionJson = """
                {
                  "durationMinutes": 45,
                  "notes": "Boa sessão",
                  "exercises": [
                    {
                      "exerciseId": %d,
                      "sets": [
                        { "setIndex": 0, "weight": 65.0, "reps": 8, "done": true }
                      ]
                    }
                  ]
                }
                """.formatted(exerciseId);

        mockMvc.perform(post("/workouts/" + workoutId + "/session")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(sessionJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.setsCompleted").value(1))
                .andExpect(jsonPath("$.totalVolume").value(520.0));
    }

    @Test
    void isolamentoEntreUsuarios_usuarioNaoVeTreinoDeOutro() throws Exception {
        String emailA = "user-a-" + UUID.randomUUID() + "@test.com";
        String emailB = "user-b-" + UUID.randomUUID() + "@test.com";
        String tokenA = registerAndLogin(emailA);
        String tokenB = registerAndLogin(emailB);

        String createResponse = mockMvc.perform(post("/workouts")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(workoutRequestJson("Treino do A", "A")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        long workoutId = objectMapper.readTree(createResponse).get("id").asLong();

        // Usuário B não deve conseguir acessar o treino do usuário A
        mockMvc.perform(get("/workouts/" + workoutId).header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        // Usuário B não deve ver o treino do usuário A na sua listagem
        mockMvc.perform(get("/workouts").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // Usuário A continua vendo o próprio treino normalmente
        mockMvc.perform(get("/workouts").header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }
}
