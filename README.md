# FitAI

> Plataforma inteligente de treinos personalizados — monorepo com frontend Next.js e backend Spring Boot.

FitAI é uma aplicação web completa para gestão e acompanhamento de treinos físicos. O utilizador cria o seu plano de treino por divisão muscular (Push/Pull/Legs, Upper/Lower, ABC…), executa as sessões com acompanhamento em tempo real, e acompanha a evolução de carga e volume ao longo do tempo. A IA sugere e gera planos de treino personalizados com base no perfil e nos objetivos de cada utilizador.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 |
| Backend | Spring Boot 4 · Java 21 · Spring Security · JWT |
| Base de dados | PostgreSQL 17/18 |
| Migrations | Flyway |
| Autenticação | JWT (access + refresh) + Google OAuth2 |
| IA | Gemini API (Google AI Studio) |
| Testes | Vitest + Testing Library (frontend) · JUnit 5 (backend) |
| Deploy | Vercel (frontend) · Render (backend + Postgres) |

---

## Funcionalidades

- **Autenticação** — registo/login com email e password ou Google OAuth2, com refresh token e recuperação de password por email
- **Splits de treino** — criação por divisão muscular: Push/Pull/Legs, Upper/Lower, ABC, ABCD, Full Body ou personalizado
- **Duplicação de blocos** — Upper 1 / Upper 2, Lower 1 / Lower 2 com dias diferentes
- **Catálogo de exercícios** — 57 exercícios pré-definidos organizados por 9 grupos musculares, com dicas de execução, séries, reps e descanso padrão
- **Pesquisa de exercícios** — filtro por nome ou grupo muscular ao adicionar exercícios ao treino
- **Execução de treino** — modo sessão ao vivo com timer de descanso automático, cronómetro, peso e reps editáveis por série, e volume calculado em tempo real
- **Histórico de carga** — cada sessão grava o peso executado e move o anterior para `prev`, permitindo comparação com a sessão anterior
- **Progresso real** — gráficos de evolução de carga por exercício, volume por treino e recordes pessoais, alimentados pelos dados das sessões guardadas
- **Calendário** — visualização mensal dos dias com treino programado por divisão
- **IA** — geração de planos de treino personalizados via Gemini API com base no nível, objetivo, dias disponíveis e equipamento
- **Dashboard** — visão geral com treino em destaque, stats ao vivo e distribuição muscular
- **Proteção de rotas** — middleware que redireciona utilizadores não autenticados para o login
- **Rate limiting** — filtro de proteção contra abuso nos endpoints de autenticação

---

## Estrutura do monorepo

```
FitAI/
├── frontend/                       # Next.js 16
│   ├── app/
│   │   ├── (auth)/login/           # Login, registo, recuperação de password
│   │   └── (dashboard)/            # Área autenticada
│   │       ├── page.tsx                # Dashboard
│   │       ├── treinos/                # Lista e detalhe/execução de treinos
│   │       ├── progresso/              # Evolução de carga e volume
│   │       ├── calendario/             # Histórico mensal
│   │       ├── ai-gen/                 # Gerador de treinos com IA
│   │       └── perfil/                 # Dados do utilizador
│   ├── components/
│   │   ├── NovoTreinoModal.tsx         # Wizard de criação de treino por split
│   │   ├── EditarTreinoModal.tsx
│   │   ├── GoogleProvider.tsx
│   │   └── ui/Charts.tsx               # LineChart, BarChart, Sparkline
│   ├── hooks/
│   │   ├── useWorkouts.ts
│   │   └── useProgress.ts
│   ├── lib/
│   │   ├── api.ts                      # Cliente HTTP com JWT
│   │   └── exercises.ts                # Catálogo de 57 exercícios
│   └── proxy.ts                        # Middleware de proteção de rotas
│
└── backend/                        # Spring Boot
    ├── Dockerfile                      # Multi-stage build para deploy
    ├── DEPLOY.md                       # Guia de deploy no Render
    └── src/main/
        ├── java/com/fitai/fitai_backend/
        │   ├── controller/             # AuthController, WorkoutController
        │   ├── service/                # AuthService, WorkoutService, GoogleTokenVerifier
        │   ├── model/                  # User, Workout, Exercise, SetData
        │   ├── dto/                    # Request/Response DTOs
        │   ├── security/               # JwtFilter, JwtUtil, RateLimitFilter, UserDetailsServiceImpl
        │   └── config/                 # SecurityConfig (CORS, JWT, BCrypt)
        └── resources/
            ├── application.properties  # Configuração com variáveis de ambiente
            └── db/migration/           # Migrations Flyway versionadas
```

---

## Pré-requisitos

- Node.js 20+
- Java 21+
- PostgreSQL 17+ a correr na porta 5432

---

## Configuração e arranque local

### 1. Base de dados

Cria a base de dados no PostgreSQL:

```sql
CREATE DATABASE fitai;
```

O schema é criado automaticamente pelo Flyway no primeiro arranque do backend.

### 2. Backend

```bash
cd backend
./gradlew bootRun
# API disponível em http://localhost:8081
```

Variáveis de ambiente esperadas (com defaults para desenvolvimento):

```properties
DB_URL=jdbc:postgresql://localhost:5432/fitai
DB_USERNAME=postgres
DB_PASSWORD=postgres
JWT_SECRET=<segredo de pelo menos 256 bits>
GOOGLE_CLIENT_ID=<client id do Google Cloud>
SENDGRID_API_KEY=<api key da SendGrid, sendgrid.com>
SENDGRID_FROM=<email verificado via Single Sender Verification>
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
# App disponível em http://localhost:3000
```

Cria o ficheiro `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8081
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<o teu Google Client ID>
GROQ_API_KEY=<a tua Groq API Key>
JWT_SECRET=<mesmo valor usado no backend — necessário para validar o login nas rotas de IA>
```

---

## Testes

### Frontend

```bash
cd frontend
npm test                  # uma execução
npm run test:watch        # modo watch
npm run test:coverage     # com cobertura
```

### Backend

```bash
cd backend
./gradlew test
```

Inclui testes unitários (services, security) e testes de integração (`*IT`) que sobem o contexto Spring completo com H2 e validam o fluxo HTTP real via MockMvc (auth ponta a ponta, isolamento de dados entre usuários).

### E2E (Playwright)

Os testes E2E rodam contra o app real (frontend + backend + Postgres), não contra mocks. Antes de rodar:

```bash
# Terminal 1 — backend + banco
cd backend
./gradlew bootRun

# Terminal 2 — frontend
cd frontend
npm run dev
```

Depois, em outro terminal:

```bash
cd frontend
npx playwright install chromium   # só na primeira vez
npm run test:e2e
```

---

## API — Endpoints

### Autenticação

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | Criar conta com email e password |
| POST | `/auth/login` | Login com email e password |
| POST | `/auth/google` | Login com Google OAuth2 |
| POST | `/auth/refresh` | Trocar refresh token por novo access token |
| POST | `/auth/forgot-password` | Solicitar email de recuperação |
| POST | `/auth/reset-password` | Definir nova password com token recebido |

### Treinos

| Método | Rota | Descrição |
|---|---|---|
| GET | `/workouts` | Listar treinos do utilizador autenticado |
| POST | `/workouts` | Criar treino |
| GET | `/workouts/progress` | Evolução de carga e volume por exercício |
| GET | `/workouts/{id}` | Buscar treino por ID |
| PUT | `/workouts/{id}` | Atualizar treino |
| DELETE | `/workouts/{id}` | Eliminar treino |
| POST | `/workouts/{id}/session` | Guardar dados de uma sessão executada |

---

## Fluxo de dados — sessão de treino

```
Utilizador executa treino
        │
        ▼
Frontend (modo sessão ao vivo)
  - Peso e reps editáveis por série
  - Timer de descanso automático
  - Volume calculado em tempo real
        │
        ▼
POST /workouts/{id}/session
  { exercises: [{ exerciseId, sets: [{ setIndex, weight, reps, done }] }] }
        │
        ▼
Backend (WorkoutService.saveSession)
  - set.prev ← set.weight   (guarda histórico)
  - set.weight ← novo peso executado
  - set.done ← true/false
  - Calcula volume total e séries concluídas
        │
        ▼
GET /workouts/progress
  - Lê weight (atual) e prev (anterior) de cada SetData
  - Calcula delta de carga por exercício
  - Devolve stats para os gráficos de evolução
```

---

## Modelo de dados

```
User
 └── Workout (N)
      ├── name, code, schedule, tags[]
      └── Exercise (N)
           ├── name, muscle, restSeconds
           └── SetData (N)
                ├── reps, weight   ← valor atual (planeado ou executado)
                ├── prev           ← peso da sessão anterior
                └── done           ← true se foi executada na última sessão
```

O schema é gerido pelo **Flyway**. As migrations estão em [backend/src/main/resources/db/migration/](backend/src/main/resources/db/migration/) e correm automaticamente no arranque do backend.

---

## Deploy

### Backend — Render

Guia completo em [backend/DEPLOY.md](backend/DEPLOY.md). Em resumo:

1. Cria um **PostgreSQL** gratuito no Render
2. Cria um **Web Service** ligado ao repositório com:
   - Root directory: `backend`
   - Runtime: `Docker`
3. Define as variáveis de ambiente abaixo
4. O Render constrói via `Dockerfile` e expõe a API em `https://fitai-backend.onrender.com`

> **Importante:** o Render fornece o `DB_URL` no formato `postgres://...`. O Spring Boot precisa de `jdbc:postgresql://...` — converte antes de colar.

### Frontend — Vercel

1. Importa o repositório na Vercel
2. Define o **Root Directory** como `frontend`
3. Configura as variáveis de ambiente (incluindo `NEXT_PUBLIC_API_URL` apontando para o backend no Render)
4. Cada push para `main` dispara um novo deploy automaticamente

---

## Variáveis de ambiente — produção

### Backend (Render)

| Variável | Descrição |
|---|---|
| `DB_URL` | URL JDBC do PostgreSQL (`jdbc:postgresql://...`) |
| `DB_USERNAME` | Utilizador da base de dados |
| `DB_PASSWORD` | Password da base de dados |
| `JWT_SECRET` | Segredo para assinar tokens JWT (mínimo 256 bits) |
| `JWT_EXPIRATION` | Validade do access token em ms (default `86400000` = 24h) |
| `JWT_REFRESH_EXPIRATION` | Validade do refresh token em ms (default `604800000` = 7 dias) |
| `GOOGLE_CLIENT_ID` | Client ID do Google Cloud Console |
| `CORS_ALLOWED_ORIGINS` | URLs permitidas separadas por vírgula |
| `SENDGRID_API_KEY` | API key da SendGrid (sendgrid.com) para envio do e-mail de reset de senha via HTTPS — SMTP direto é bloqueado em várias plataformas de deploy |
| `SENDGRID_FROM` | Endereço remetente — precisa estar verificado via Single Sender Verification no painel da SendGrid |
| `FRONTEND_URL` | URL do frontend, usada para montar o link de reset de senha |

### Frontend (Vercel)

| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL pública do backend |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID do Google (mesmo valor do backend) |
| `GROQ_API_KEY` | API Key da Groq, usada pela rota de geração de treino com IA |
| `JWT_SECRET` | Mesmo segredo do backend — usado para validar o login antes de gerar treino com IA |

---

## Licença

MIT
