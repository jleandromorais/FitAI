# Arquitetura

> Este documento explica **como** o FitAI é construído e **por quê** — as decisões, os trade-offs aceitos conscientemente, e os pontos que ainda são dívida técnica conhecida. Para "o que" o produto faz, ver o [README](README.md).

---

## Visão geral

```
┌─────────────────┐        HTTPS/JSON        ┌──────────────────┐        JDBC        ┌────────────┐
│  Next.js 16      │ ───────────────────────▶ │  Spring Boot 4    │ ─────────────────▶ │ PostgreSQL │
│  (frontend)      │ ◀─────────────────────── │  (backend)        │ ◀───────────────── │            │
└─────────────────┘      JWT Bearer token     └──────────────────┘                     └────────────┘
        │
        ├── Google OAuth2 (login social)
        └── Groq API (geração de treino por IA — chamada direto do frontend via Next.js API route)
```

Dois serviços deployados de forma independente (Vercel + Render), comunicando só por HTTP com JWT. Sem gateway, sem fila, sem cache distribuído — a escala atual (app pessoal, uso solo) não justifica essa complexidade. Ver a seção [Por que não microserviços](#por-que-não-microserviços) para o raciocínio completo.

---

## Backend — camadas

```
controller/  → thin, delega pro service. Sem lógica de negócio aqui.
service/     → lógica de negócio. WorkoutService, AuthService, GoogleTokenVerifier.
repository/  → Spring Data JPA, uma interface por agregado.
model/       → entidades JPA (User, Workout, Exercise, SetData, WorkoutSession).
dto/         → contratos de request/response, nunca expõe entidades JPA direto.
exception/   → GlobalExceptionHandler centraliza o mapeamento pra HTTP status.
security/    → JwtFilter, JwtUtil, RateLimitFilter.
```

Convenção testada: erros de negócio viram exceções tipadas (`ResourceNotFoundException`, etc.) capturadas uma única vez no `GlobalExceptionHandler` — nenhum controller tem `@ExceptionHandler` próprio.

---

## O modelo de dados tem duas fontes para "progresso" — e isso é proposital, com uma regra clara

Esse é o ponto mais importante deste documento. Duas entidades guardam informação sobre treinos executados, com propósitos diferentes:

### `Workout.exercises[].sets[]` (SetData) — snapshot da última execução

Cada `SetData` guarda `weight` (peso atual) e `prev` (peso da sessão anterior) *por série, por exercício*. É atualizado a cada `POST /workouts/{id}/session`. Serve pra responder "qual foi minha evolução de carga no Supino?" — o tipo de pergunta que exige saber o exercício específico, não só um total.

**Limitação intencional:** só guarda a última execução. Se você fizer o Treino A 50 vezes, `SetData` só sabe sobre a 50ª.

### `WorkoutSession` — histórico real, uma linha por sessão executada

Guarda `executedAt`, `totalVolume`, `setsCompleted`, `durationMinutes` — um registro por sessão de verdade, sem sobrescrever nada. É a fonte usada pro streak (`computeCurrentStreak`) e pra qualquer estatística que precise saber "quanto, ao todo, em toda a história".

### A regra

| Pergunta | Fonte |
|---|---|
| "Qual foi meu ganho de carga no Supino desde a última vez?" | `SetData` (`ExerciseProgressDto.currentWeight/prevWeight/delta`) |
| "Quanto volume eu já levantei, no total?" | `WorkoutSession` (soma de `totalVolume` de todas as sessões) |
| "Quantos dias seguidos eu treinei?" | `WorkoutSession` (`executedAt` de cada sessão) |

**Bug já corrigido por violar essa regra:** `WorkoutService.getProgress()` calculava `totalVolume`/`totalSetsCompleted` somando `SetData` em vez de `WorkoutSession` — ou seja, um treino repetido várias vezes contava só a última execução. O sintoma visível era o mesmo rótulo ("Volume total") mostrando números diferentes em telas diferentes do frontend, porque cada tela lia de um jeito. Corrigido consolidando `getProgress()` pra sempre somar `WorkoutSession`. Se você for adicionar uma nova estatística agregada (soma, média, total histórico), ela quase certamente deveria vir de `WorkoutSession`, não de `SetData`.

---

## Frontend — hooks como camada de dados

Sem Redux, sem React Query/SWR — cada hook em `frontend/hooks/` é dono do seu próprio `data`/`loading`/`error`, com fetch manual via `lib/api.ts`. Funciona bem no tamanho atual do app; a única dor real é duplicação de padrão (todo hook reimplementa o mesmo trio de estados) — aceitável, não crítico.

Padrão estabelecido: quando um hook expõe `reload()`, ele limpa `error` **imediatamente** ao ser chamado (não só quando o novo fetch resolve) — evita a UI mostrar um erro velho "grudado" enquanto o retry está em andamento. Ver `useWorkouts.ts`/`useProgress.ts`.

Componentes de página nunca fazem fetch direto — sempre via hook. Isso é o que torna os hooks testáveis isoladamente (mock de `@/lib/api`) sem precisar montar a árvore de componentes inteira.

---

## Autenticação

JWT access token (curta duração) + refresh token (hash SHA-256 persistido, nunca o valor bruto). Login social via Google OAuth2, verificado no backend (`GoogleTokenVerifier`) antes de emitir os próprios tokens da aplicação — o frontend nunca confia diretamente no token do Google.

`proxy.ts` (nome do middleware no Next.js 16) decide acesso a rotas protegidas com base só no **cookie** `token` — não no `localStorage`. Os dois são escritos juntos em `saveSession()`/`refreshAccessToken()`; se um dia esse par sair de sincronia, o sintoma é usuário autenticado sendo redirecionado pro login (cookie ausente) mesmo com `localStorage` válido, ou vice-versa.

---

## Por que não microserviços

Decisão consciente, não falta de conhecimento: microserviços resolvem problemas de **escala de time** (deploy independente entre squads) e **escala de carga** (partes do sistema crescendo em ritmos diferentes). Nenhum dos dois existe aqui — é um projeto solo, com uso pessoal. Separar em serviços adicionaria latência de rede entre partes que hoje são uma chamada de método, complexidade operacional (service discovery, tracing distribuído, deploy coordenado) e superfície de falha, sem nenhum ganho real proporcional.

O limite real de escala hoje é o cálculo de streak (`WorkoutSession.findAllByUserEmail` sem paginação) — resolver isso é paginação/índice, não arquitetura distribuída.

---

## Dívida técnica conhecida

Registrada aqui pra não virar surpresa. Nenhum destes bloqueia o uso atual do app:

- **Sem paginação** no histórico de sessões usado pro streak — full scan por usuário a cada carregamento do perfil. Ok na escala atual.
- **Sem abstração de `Clock`** — `LocalDate.now()`/`Instant.now()` chamados direto nos services, usando o timezone da JVM do servidor, não o do usuário. Testes de data ficam acoplados ao relógio real; correção multi-timezone exigiria injeção de `Clock`.
- **`ProgressDto` com construtor posicional de 7 argumentos** (`@AllArgsConstructor`) — sem builder, risco de troca silenciosa de campos numa reordenação futura.
- **Sem `AbortController`** nos hooks de fetch do frontend — uma resposta antiga que chega depois de uma mais nova pode sobrescrever estado já correto, numa corrida de requests.
- **Termos de Uso / Política de Privacidade** não existem como páginas reais, e não há mecanismo de consentimento explícito no cadastro — pendente de decisão de produto/jurídico antes de virar código.

---

## Testes

- **Backend:** unitários com Mockito (sem contexto Spring) para services; `*IT` sobem o contexto completo com H2 e MockMvc para o fluxo HTTP real, incluindo isolamento de dados entre usuários.
- **Frontend:** Vitest + Testing Library, hooks/páginas mockando o módulo `@/lib/api` inteiro. Toda correção de bug nesta sessão de trabalho foi validada com **teste de mutação manual** — quebrar o código de propósito, confirmar que o teste novo falha, reverter — não só "o teste passa", mas "o teste pegaria a regressão se alguém reintroduzisse o bug".
- **E2E:** Playwright contra o app real (frontend + backend + Postgres), não contra mocks.
