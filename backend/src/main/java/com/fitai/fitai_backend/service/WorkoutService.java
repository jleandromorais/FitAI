package com.fitai.fitai_backend.service;

import com.fitai.fitai_backend.dto.*;
import com.fitai.fitai_backend.exception.ResourceNotFoundException;
import com.fitai.fitai_backend.model.*;
import com.fitai.fitai_backend.repository.UserRepository;
import com.fitai.fitai_backend.repository.WorkoutRepository;
import com.fitai.fitai_backend.repository.WorkoutSessionRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class WorkoutService {

    private static final Logger log = LoggerFactory.getLogger(WorkoutService.class);

    private final WorkoutRepository        workoutRepository;
    private final UserRepository           userRepository;
    private final WorkoutSessionRepository sessionRepository;

    /*
     * LISTAR TREINOS
     * "Me dá todos os treinos que pertencem a esse email"
     * É como pedir: "me mostra todos os cadernos que têm o meu nome na capa"
     */
    public List<WorkoutDto> listByUser(String email) {
        log.debug("Listando treinos: email={}", email);
        List<WorkoutDto> result = workoutRepository.findAllByUserEmail(email)
                .stream().map(this::toDto).toList();
        log.debug("Treinos encontrados: email={}, total={}", email, result.size());
        return result;
    }

    /*
     * BUSCAR UM TREINO ESPECÍFICO
     * "Me dá o treino de número X, mas só se ele pertencer a esse email"
     * É como pedir: "me dá o caderno número 5, mas só se tiver meu nome nele"
     * Se não achar, grita um erro: "Treino não encontrado!"
     */
    public WorkoutDto getById(Long id, String email) {
        log.debug("Buscando treino: id={}, email={}", id, email);
        Workout w = workoutRepository.findByIdAndUserEmail(id, email)
                .orElseThrow(() -> {
                    log.warn("Treino não encontrado: id={}, email={}", id, email);
                    return new ResourceNotFoundException("Treino não encontrado.");
                });
        return toDto(w);
    }

    /*
     * CRIAR TREINO
     * @Transactional = "faz tudo isso junto ou não faz nada"
     * É como construir uma casa: ou você constrói ela inteira, ou não começa.
     * Se der erro no meio, desfaz tudo para não ficar pela metade.
     */
    @Transactional
    public WorkoutDto create(WorkoutRequest req, String email) {
        log.info("Criando treino: email={}, nome={}", email, req.getName());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Criação de treino falhou — usuário não encontrado: email={}", email);
                    return new ResourceNotFoundException("Usuário não encontrado.");
                });

        // Monta o treino como uma caixa vazia com nome, código (A/B/C), dias e tags
        Workout workout = Workout.builder()
                .user(user)
                .name(req.getName())
                .code(req.getCode())
                .schedule(req.getSchedule())
                .tags(req.getTags() != null ? req.getTags() : List.of()) // Se não tiver tags, usa lista vazia
                .build();

        // Se o treino tiver exercícios, adiciona um por um dentro da caixa
        if (req.getExercises() != null) {
            for (ExerciseDto eDto : req.getExercises()) {

                // Para cada exercício, cria uma "ficha" com nome, músculo e tempo de descanso
                Exercise exercise = Exercise.builder()
                        .workout(workout)   // Liga o exercício ao treino pai
                        .name(eDto.getName())
                        .muscle(eDto.getMuscle())
                        .restSeconds(eDto.getRestSeconds())
                        .build();

                // Se o exercício tiver séries, adiciona uma por uma na ficha
                if (eDto.getSets() != null) {
                    for (SetDataDto sDto : eDto.getSets()) {

                        // Cada série tem: quantas repetições, quanto peso, se foi feita, e o peso da vez anterior
                        SetData set = SetData.builder()
                                .exercise(exercise)
                                .reps(sDto.getReps())
                                .weight(sDto.getWeight())
                                .done(Boolean.TRUE.equals(sDto.getDone())) // null-safe: null → false
                                .prev(sDto.getPrev())
                                .build();

                        exercise.getSets().add(set); // Coloca a série dentro do exercício
                    }
                }
                workout.getExercises().add(exercise); // Coloca o exercício dentro do treino
            }
        }

        WorkoutDto dto = toDto(workoutRepository.save(workout));
        log.info("Treino criado: id={}, email={}", dto.getId(), email);
        return dto;
    }

    /*
     * ATUALIZAR TREINO
     * Substitui completamente os dados do treino (nome, código, dias, tags e exercícios).
     * Remove os exercícios/sets antigos via orphanRemoval e recria do zero,
     * garantindo que não fique lixo no banco.
     */
    @Transactional
    public WorkoutDto update(Long id, WorkoutRequest req, String email) {
        log.info("Atualizando treino: id={}, email={}", id, email);
        Workout workout = workoutRepository.findByIdAndUserEmail(id, email)
                .orElseThrow(() -> {
                    log.warn("Atualização falhou — treino não encontrado: id={}, email={}", id, email);
                    return new ResourceNotFoundException("Treino não encontrado.");
                });

        // Atualiza os campos simples
        workout.setName(req.getName());
        workout.setCode(req.getCode());
        workout.setSchedule(req.getSchedule());
        workout.setTags(req.getTags() != null ? req.getTags() : List.of());

        // Remove todos os exercícios antigos — o orphanRemoval cuida dos sets
        workout.getExercises().clear();

        // Recria os exercícios com os novos dados
        if (req.getExercises() != null) {
            for (ExerciseDto eDto : req.getExercises()) {
                Exercise exercise = Exercise.builder()
                        .workout(workout)
                        .name(eDto.getName())
                        .muscle(eDto.getMuscle())
                        .restSeconds(eDto.getRestSeconds())
                        .build();

                if (eDto.getSets() != null) {
                    for (SetDataDto sDto : eDto.getSets()) {
                        SetData set = SetData.builder()
                                .exercise(exercise)
                                .reps(sDto.getReps())
                                .weight(sDto.getWeight())
                                .done(Boolean.TRUE.equals(sDto.getDone())) // null-safe
                                .prev(sDto.getPrev())
                                .build();
                        exercise.getSets().add(set);
                    }
                }
                workout.getExercises().add(exercise);
            }
        }

        WorkoutDto updated = toDto(workoutRepository.save(workout));
        log.info("Treino atualizado: id={}, email={}", id, email);
        return updated;
    }

    /*
     * SALVAR SESSÃO DE TREINO
     *
     * Chamado quando o utilizador clica "Finalizar treino".
     * Para cada série recebida:
     *   1. Marca done = true (ou false se o utilizador não a completou)
     *   2. Move o peso atual para prev (histórico da última execução)
     *   3. Grava o novo peso e reps reais
     *
     * Isso permite mostrar na próxima sessão "última vez: 60kg × 10"
     * e calcular a evolução de carga ao longo do tempo.
     */
    @Transactional
    public SessionResponse saveSession(Long workoutId, SessionRequest req, String email) {
        log.info("Salvando sessão: workoutId={}, email={}", workoutId, email);
        Workout workout = workoutRepository.findByIdAndUserEmail(workoutId, email)
                .orElseThrow(() -> {
                    log.warn("Sessão falhou — treino não encontrado: id={}, email={}", workoutId, email);
                    return new ResourceNotFoundException("Treino não encontrado.");
                });

        int setsCompleted = 0;
        double totalVolume = 0.0;

        for (ExerciseSessionDto exDto : req.getExercises()) {
            // Encontra o exercício pelo ID dentro do treino
            Exercise exercise = workout.getExercises().stream()
                    .filter(e -> e.getId().equals(exDto.getExerciseId()))
                    .findFirst()
                    .orElse(null);

            if (exercise == null) continue;

            for (SetSessionDto setDto : exDto.getSets()) {
                // getSetIndex() é Integer — usar intValue() para evitar unboxing implícito
                if (setDto.getSetIndex() == null) continue;
                int idx = setDto.getSetIndex().intValue();
                if (idx < 0 || idx >= exercise.getSets().size()) continue;

                SetData set = exercise.getSets().get(idx);

                // Guarda o peso anterior antes de sobrescrever
                set.setPrev(set.getWeight());

                // Actualiza com os valores reais da sessão (mantém valor antigo se null)
                if (setDto.getWeight() != null) set.setWeight(setDto.getWeight());
                if (setDto.getReps()   != null) set.setReps(setDto.getReps());
                set.setDone(Boolean.TRUE.equals(setDto.getDone()));

                if (Boolean.TRUE.equals(setDto.getDone())) {
                    setsCompleted++;
                    // Null-safe: usa 0 como fallback para não lançar NullPointerException
                    double w = set.getWeight() != null ? set.getWeight().doubleValue() : 0.0;
                    int    r = set.getReps()   != null ? set.getReps().intValue()       : 0;
                    totalVolume += w * r;
                }
            }
        }

        // Arredonda o volume para 1 casa decimal
        totalVolume = Math.round(totalVolume * 10.0) / 10.0;

        workoutRepository.save(workout);

        // Registra o histórico da sessão — o dono já veio junto com o treino
        // (findByIdAndUserEmail já garantiu que pertence a esse email), sem
        // necessidade de uma segunda busca redundante ao banco.
        sessionRepository.save(WorkoutSession.builder()
                .workout(workout)
                .user(workout.getUser())
                .executedAt(LocalDateTime.now())
                .durationMinutes(req.getDurationMinutes() != null ? req.getDurationMinutes() : 0)
                .setsCompleted(setsCompleted)
                .totalVolume(totalVolume)
                .build());

        SessionResponse response = new SessionResponse(setsCompleted, totalVolume,
                req.getDurationMinutes() != null ? req.getDurationMinutes() : 0);
        log.info("Sessão salva: workoutId={}, email={}, series={}, volume={}", workoutId, email, setsCompleted, totalVolume);
        return response;
    }

    public List<SessionHistoryDto> getRecentSessions(String email, int days) {
        LocalDateTime since = LocalDateTime.now().minusDays(days);
        return sessionRepository
                .findAllByUserEmailAndExecutedAtAfterOrderByExecutedAtDesc(email, since)
                .stream()
                .map(s -> new SessionHistoryDto(
                        s.getWorkout().getId(),
                        s.getWorkout().getName(),
                        s.getWorkout().getCode(),
                        s.getExecutedAt(),
                        s.getDurationMinutes(),
                        s.getSetsCompleted(),
                        s.getTotalVolume()
                ))
                .toList();
    }

    /*
     * PROGRESSO DO UTILIZADOR
     *
     * Calcula a evolução de carga por exercício e o volume total acumulado.
     * Usa os campos `weight` (peso atual) e `prev` (peso da sessão anterior)
     * que são atualizados em cada sessão pelo saveSession().
     *
     * Não requer tabela extra — os dados já estão no SetData.
     */
    public ProgressDto getProgress(String email) {
        List<Workout> workouts = workoutRepository.findAllByUserEmail(email);

        // Volume e séries globais
        double totalVolume = 0.0;
        int totalSetsCompleted = 0;

        // Volume e label por treino (para o gráfico de barras)
        List<Double> volumePerWorkout = new java.util.ArrayList<>();
        List<String> workoutLabels   = new java.util.ArrayList<>();

        // Mapa exercício → ExerciseProgressDto (agrupa séries do mesmo exercício)
        // Chave = nome do exercício (case-insensitive para evitar duplicatas)
        java.util.Map<String, ExerciseProgressDto> exerciseMap = new java.util.LinkedHashMap<>();

        for (Workout w : workouts) {
            double workoutVolume = 0.0;

            for (Exercise ex : w.getExercises()) {
                // Peso máximo atual e anterior entre todas as séries do exercício
                double maxCurrent = 0.0;
                double maxPrev    = 0.0;
                int    setsDone   = 0;

                for (SetData s : ex.getSets()) {
                    double curr = s.getWeight() != null ? s.getWeight().doubleValue() : 0.0;
                    double prev = s.getPrev()   != null ? s.getPrev().doubleValue()   : 0.0;
                    int    reps = s.getReps()   != null ? s.getReps().intValue()       : 0;

                    if (curr > maxCurrent) maxCurrent = curr;
                    if (prev > maxPrev)    maxPrev    = prev;

                    if (Boolean.TRUE.equals(s.getDone())) {
                        workoutVolume  += curr * reps;
                        totalVolume    += curr * reps;
                        totalSetsCompleted++;
                        setsDone++;
                    }
                }

                // Registra ou actualiza o exercício no mapa (mantém o maior peso visto)
                String key = ex.getName().toLowerCase(java.util.Locale.ROOT);
                ExerciseProgressDto existing = exerciseMap.get(key);
                if (existing == null || maxCurrent > existing.getCurrentWeight()) {
                    exerciseMap.put(key, new ExerciseProgressDto(
                            ex.getName(),
                            ex.getMuscle(),
                            maxCurrent,
                            maxPrev,
                            Math.round((maxCurrent - maxPrev) * 10.0) / 10.0,
                            ex.getSets().size()
                    ));
                }
            }

            volumePerWorkout.add(Math.round(workoutVolume * 10.0) / 10.0);
            workoutLabels.add(w.getName());
        }

        // Ordena exercícios por delta decrescente (maior ganho primeiro)
        List<ExerciseProgressDto> exercises = new java.util.ArrayList<>(exerciseMap.values());
        exercises.sort((a, b) -> Double.compare(b.getDelta(), a.getDelta()));

        return new ProgressDto(
                Math.round(totalVolume * 10.0) / 10.0,
                totalSetsCompleted,
                workouts.size(),
                volumePerWorkout,
                workoutLabels,
                exercises,
                computeCurrentStreak(workouts, email)
        );
    }

    // Abreviações em português (sem acento, minúsculas) usadas no campo livre
    // Workout.schedule — o mesmo formato produzido tanto pelo NovoTreinoModal
    // quanto pelo prompt de geração por IA (ver DAYS_OPTIONS no frontend).
    // Chave já sem acento — o acento é removido do token antes do lookup.
    private static final Map<String, DayOfWeek> DAY_ABBREVIATIONS = Map.of(
            "seg", DayOfWeek.MONDAY,
            "ter", DayOfWeek.TUESDAY,
            "qua", DayOfWeek.WEDNESDAY,
            "qui", DayOfWeek.THURSDAY,
            "sex", DayOfWeek.FRIDAY,
            "sab", DayOfWeek.SATURDAY,
            "dom", DayOfWeek.SUNDAY
    );

    // schedule é texto livre; calendario/page.tsx e EditarTreinoModal.tsx no
    // frontend já normalizam tanto "Seg, Qui" quanto "Seg · Qui" com esse
    // mesmo padrão de separadores — o parser aqui precisa aceitar os mesmos,
    // senão treinos com "·" ficam com schedule vazio e o streak zera à toa.
    private static Set<DayOfWeek> parseScheduledDays(List<Workout> workouts) {
        Set<DayOfWeek> days = new java.util.HashSet<>();
        for (Workout w : workouts) {
            if (w.getSchedule() == null) continue;
            for (String token : w.getSchedule().split("[,·\\s]+")) {
                String key = token.trim().toLowerCase(java.util.Locale.ROOT).replace("á", "a");
                if (key.isEmpty()) continue;
                DayOfWeek day = DAY_ABBREVIATIONS.get(key);
                if (day == null) {
                    log.warn("Dia da semana não reconhecido em schedule: token='{}', workoutId={}", token, w.getId());
                } else {
                    days.add(day);
                }
            }
        }
        return days;
    }

    /*
     * STREAK ATUAL
     *
     * Conta dias consecutivos, andando de hoje para trás, em que o
     * utilizador treinou em todos os dias que tinha algum treino agendado
     * (schedule). Dias fora de qualquer schedule são pulados — não contam
     * nem quebram a sequência. Se hoje é um dia agendado mas ainda não teve
     * sessão, isso não quebra o streak (o dia ainda não acabou).
     *
     * Sem limite de janela de datas — usa TODO o histórico de sessões,
     * diferente de getRecentSessions() que só olha os últimos N dias.
     */
    private Integer computeCurrentStreak(List<Workout> workouts, String email) {
        Set<DayOfWeek> scheduledDays = parseScheduledDays(workouts);

        if (scheduledDays.isEmpty()) return 0;

        Set<LocalDate> trainedDates = sessionRepository.findAllByUserEmail(email).stream()
                .map(s -> s.getExecutedAt().toLocalDate())
                .collect(java.util.stream.Collectors.toSet());

        LocalDate today = LocalDate.now();
        LocalDate cursor = today;
        int streak = 0;

        // Limite de segurança pra garantir término mesmo num estado de dados patológico
        for (int i = 0; i < 3650; i++) {
            if (!scheduledDays.contains(cursor.getDayOfWeek())) {
                cursor = cursor.minusDays(1);
                continue;
            }
            if (trainedDates.contains(cursor)) {
                streak++;
                cursor = cursor.minusDays(1);
            } else if (cursor.equals(today)) {
                // Hoje é dia agendado mas ainda não treinou — dia não acabou, não quebra
                cursor = cursor.minusDays(1);
            } else {
                break; // dia agendado no passado sem sessão — streak quebrado
            }
        }

        return streak;
    }

    /*
     * DELETAR TREINO
     * Verifica se o treino existe E pertence ao usuário antes de apagar.
     * Não deixa apagar treino dos outros!
     */
    @Transactional
    public void delete(Long id, String email) {
        log.info("Deletando treino: id={}, email={}", id, email);
        Workout w = workoutRepository.findByIdAndUserEmail(id, email)
                .orElseThrow(() -> {
                    log.warn("Deleção falhou — treino não encontrado: id={}, email={}", id, email);
                    return new ResourceNotFoundException("Treino não encontrado.");
                });
        workoutRepository.delete(w);
        log.info("Treino deletado: id={}, email={}", id, email);
    }

    /*
     * CONVERSOR (mapper): Workout → WorkoutDto
     *
     * O banco guarda as informações num formato "pesado" (com todas as relações).
     * O app precisa de um formato "leve" (só o que precisa mostrar na tela).
     * Esse método faz essa tradução, como um tradutor entre dois idiomas.
     *
     * Ele também calcula na hora:
     * - totalSets  = soma de todas as séries de todos os exercícios
     * - volume     = soma de (peso × reps) de cada série — quanto você levantou no total
     * - duration   = estimativa de duração (cada série leva ~3 min com descanso)
     */
    private WorkoutDto toDto(Workout w) {

        // Converte cada exercício do banco para o formato leve
        List<ExerciseDto> exercises = w.getExercises().stream().map(e -> {

            // Converte cada série para o formato leve
            List<SetDataDto> sets = e.getSets().stream().map(s ->
                SetDataDto.builder()
                    .id(s.getId())
                    .reps(s.getReps())
                    .weight(s.getWeight())
                    .done(s.getDone())
                    .prev(s.getPrev())
                    .build()
            ).toList();

            return ExerciseDto.builder()
                    .id(e.getId())
                    .name(e.getName())
                    .muscle(e.getMuscle())
                    .restSeconds(e.getRestSeconds())
                    .sets(sets)
                    .build();
        }).toList();

        // Conta o total de séries: soma o tamanho da lista de séries de cada exercício
        int totalSets = exercises.stream().mapToInt(e -> e.getSets().size()).sum();

        // Calcula o volume total: peso × reps de cada série, somados
        // Ex: 3 séries de 10 reps com 60kg = 1800kg de volume
        // Null-safe: usa doubleValue()/intValue() explícitos para evitar unboxing implícito
        double volume = exercises.stream()
                .flatMap(e -> e.getSets().stream())
                .mapToDouble(s -> (s.getWeight() != null ? s.getWeight().doubleValue() : 0.0)
                                * (s.getReps()   != null ? s.getReps().intValue()       : 0))
                .sum();

        // Monta o DTO final com tudo calculado
        return WorkoutDto.builder()
                .id(w.getId())
                .name(w.getName())
                .code(w.getCode())
                .schedule(w.getSchedule())
                .tags(w.getTags())
                .exercises(exercises)
                .totalSets(totalSets)
                .volume(Math.round(volume * 10.0) / 10.0) // Arredonda para 1 casa decimal
                .duration(totalSets * 3)                   // Estimativa: 3 minutos por série
                .build();
    }
}
