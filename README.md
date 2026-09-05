# FitAI 🏋️‍♂️🧠

![Next.js](https://img.shields.io/badge/Next.js_16-black?style=for-the-badge&logo=next.js)
![Spring Boot](https://img.shields.io/badge/Spring_Boot_4-6DB33F?style=for-the-badge&logo=spring-boot&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_17-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Groq](https://img.shields.io/badge/AI-Groq_Cloud-f55036?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)

> Plataforma inteligente de treinos personalizados — monorepo com frontend Next.js e backend Spring Boot.

O **FitAI** é uma aplicação web completa para gestão e acompanhamento de treinos físicos. Crie planos por divisão muscular (Push/Pull/Legs, Upper/Lower, ABC), execute sessões com acompanhamento em tempo real e analise a sua evolução de carga e volume. Precisa de inspiração? A nossa integração com IA gera rotinas personalizadas com base no seu perfil, objetivos e equipamento disponível.

🔗 **Notas de Arquitetura:** Para decisões de design, trade-offs aceitos e dívida técnica conhecida, consulte o [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 📑 Índice

1. [Preview](#-preview)
2. [Stack Tecnológica](#-stack-tecnológica)
3. [Funcionalidades Principais](#-funcionalidades-principais)
4. [Estrutura do Monorepo](#-estrutura-do-monorepo)
5. [Configuração e Arranque Local](#-configuração-e-arranque-local)
6. [Testes](#-testes)
7. [Documentação da API](#-documentação-da-api)
8. [Fluxo de Dados](#-fluxo-de-dados)
9. [Deploy](#-deploy)
10. [Variáveis de Ambiente](#-variáveis-de-ambiente)

---

## 📸 Preview

| Landing page | Login |
|---|---|
| ![Landing page do FitAI](IMGREAD/page) | ![Tela de login do FitAI](IMGREAD/login) |

| Dashboard | Execução de treino |
|---|---|
| ![Dashboard do FitAI](IMGREAD/Pagprincipal) | ![Execução de treino ao vivo](docs/screenshots/treino-execucao.png) |

| Progresso | Geração de treino com IA |
|---|---|
| ![Gráficos de progresso](docs/screenshots/progresso.png) | ![Gerador de treino com IA](docs/screenshots/ai-gen.png) |

> 💡 **Nota para devs:** Salve os seus *prints* na pasta [`docs/screenshots/`](docs/screenshots/) com os nomes exatos referenciados acima para que sejam renderizados automaticamente.

---

## 🛠 Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| **Frontend** | Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 |
| **Backend** | Spring Boot 4 · Java 21 · Spring Security · JWT |
| **Base de Dados** | PostgreSQL 17/18 · Flyway (Migrations) |
| **Autenticação** | JWT (Access + Refresh) · Google OAuth2 |
| **Inteligência Artificial** | Groq API (Llama, via Groq Cloud) |
| **Testes** | Vitest + Testing Library (Front) · JUnit 5 (Back) · Playwright (E2E) |
| **Deploy** | Vercel (Frontend) · Render (Backend + Postgres) |

---

## ✨ Funcionalidades Principais

* **Autenticação Robusta:** Registo/login tradicional ou Google OAuth2, com sistema de *refresh tokens* e recuperação de password. Proteção contra abusos via *Rate Limiting*.
* **Gestão de Treinos:** Criação de *splits* musculares flexíveis (PPL, Upper/Lower, Full Body). Suporte a duplicação de blocos para treinos alternados (ex: Upper 1 / Upper 2).
* **Catálogo Integrado:** 57 exercícios pré-definidos divididos por 9 grupos musculares. Pesquisa rápida por nome ou agrupamento.
* **Modo Sessão ao Vivo:** Execução guiada com *timer* de descanso automático, cronómetro geral, e edição fluída de pesos e repetições série a série.
* **Histórico e Progressão:** Gravação inteligente de cargas. A sessão atual exibe o peso da sessão anterior para facilitar a progressão de carga (Overload).
* **Dashboard Analítico:** Gráficos de evolução de carga, volume acumulado e recordes pessoais alimentados por dados reais das sessões concluídas.
* **Geração por IA:** Criação de treinos sob medida, analisando o nível de experiência do utilizador, frequência semanal e material disponível.

---

## 📂 Estrutura do Monorepo

```text
FitAI/
├── frontend/                       # Next.js 16 App Router
│   ├── app/
│   │   ├── (auth)/                 # Login, registo, recuperação
│   │   └── (dashboard)/            # Rotas protegidas (treinos, progresso, ai-gen)
│   ├── components/                 # UI components, Modais e Gráficos
│   ├── hooks/                      # Lógica de estado (Workouts, Sessions, Progress)
│   ├── lib/                        # Clientes API e Dicionário de Exercícios
│   └── proxy.ts                    # Middleware de proteção de rotas
│
└── backend/                        # Spring Boot 4
    ├── Dockerfile                  # Multi-stage build para produção
    ├── DEPLOY.md                   # Instruções detalhadas para Render
    └── src/main/
        ├── java/com/fitai/fitai_backend/
        │   ├── controller/         # Endpoints REST
        │   ├── service/            # Regras de negócio e integração Google Auth
        │   ├── model/ & dto/       # Entidades JPA e Records/Classes DTO
        │   └── security/           # Filtros JWT e Configurações CORS/BCrypt
        └── resources/
            └── db/migration/       # Scripts SQL (Flyway)
```

---

## 🚀 Configuração e Arranque Local

### Pré-requisitos
* Node.js 20+
* Java 21+
* PostgreSQL 17+ (a correr na porta 5432)

### 1. Base de Dados
Crie a base de dados (o schema será gerado automaticamente pelo Flyway no arranque do backend):
```sql
CREATE DATABASE fitai;
```

### 2. Backend
```bash
cd backend
./gradlew bootRun
```
*A API ficará disponível em `http://localhost:8081`.*

### 3. Frontend
Crie o ficheiro `frontend/.env.local` baseado nas variáveis de ambiente listadas [abaixo](#-variáveis-de-ambiente) e execute:
```bash
cd frontend
npm install
npm run dev
```
*A App ficará disponível em `http://localhost:3000`.*

---

## 🧪 Testes

**Frontend:**
```bash
cd frontend
npm test                  # Execução única (Vitest)
npm run test:watch        # Modo Watch
npm run test:coverage     # Relatório de cobertura
```

**Backend:**
```bash
cd backend
./gradlew test            # Testes unitários e de integração (com H2 e MockMvc)
```

**E2E (Playwright):**
Garante o funcionamento de ponta a ponta (Front + Back + DB reais).
```bash
# Certifique-se de que o Frontend e Backend estão a correr em outros terminais
cd frontend
npx playwright install chromium   # Apenas na primeira execução
npm run test:e2e
```

---

## 📡 Documentação da API

### Autenticação (`/auth`)
| Método | Rota | Descrição |
|:---:|---|---|
| `POST` | `/register` | Registo com email/password |
| `POST` | `/login` | Login com email/password |
| `POST` | `/google` | Login via Google OAuth2 |
| `POST` | `/refresh` | Rotação de *Refresh Token* |
| `POST` | `/forgot-password`| Pedido de recuperação de conta |
| `POST` | `/reset-password` | Redefinição de senha via token |

### Treinos (`/workouts`)
| Método | Rota | Descrição |
|:---:|---|---|
| `GET` | `/` | Lista todos os treinos do utilizador |
| `POST` | `/` | Cria um novo treino |
| `GET` | `/progress` | Obtém estatísticas de evolução de carga/volume |
| `GET` | `/{id}` | Detalhes de um treino específico |
| `PUT` | `/{id}` | Atualiza estrutura de um treino |
| `DELETE`| `/{id}` | Elimina um treino |
| `POST` | `/{id}/session` | Submete dados de uma sessão concluída |

---

## 🔄 Fluxo de Dados: Sessão de Treino

O armazenamento de dados de treino resolve a dicotomia entre "estado atual da carga" e "histórico estatístico".

1. **Frontend (Sessão):** O utilizador executa o treino. O peso e as repetições são ajustados.
2. **Submissão:** O *payload* é enviado para `POST /workouts/{id}/session`.
3. **Backend (`WorkoutService.saveSession`):**
   * Atualiza a tabela `SetData`: O `weight` anterior move-se para `prev`. O novo `weight` é guardado. Isso garante que a próxima sessão mostre a carga exata a ser batida.
   * Insere na tabela `WorkoutSession`: Grava uma nova linha imutável com `totalVolume`, `setsCompleted` e data, servindo como base absoluta para todos os gráficos do dashboard.
4. **Visualização (`GET /workouts/progress`):** Cruza a evolução estática (SetData) com a métrica temporal (WorkoutSessions).

---

## ☁️ Deploy

### Backend (Render)
1. Crie uma instância PostgreSQL gratuita.
2. Crie um **Web Service** ligado a este repositório.
3. Configure o root para `backend` e o runtime para `Docker`.
4. Defina as variáveis de ambiente necessárias. *(Dica: converta o `postgres://` fornecido pelo Render para `jdbc:postgresql://`)*.

> 📖 **Guia Passo-a-Passo:** Consulte [backend/DEPLOY.md](backend/DEPLOY.md)

### Frontend (Vercel)
1. Importe o repositório na Vercel e defina o **Root Directory** como `frontend`.
2. Configure as variáveis de ambiente (apontando `NEXT_PUBLIC_API_URL` para o serviço do Render).
3. Deploys contínuos são feitos automaticamente em pushes para a *branch* `main`.

---

## ⚙️ Variáveis de Ambiente

### Backend (.properties / Render)
| Variável | Descrição / Exemplo |
|---|---|
| `DB_URL` | URL JDBC do Postgres (`jdbc:postgresql://...`) |
| `DB_USERNAME` / `DB_PASSWORD` | Credenciais da base de dados |
| `JWT_SECRET` | Chave de assinatura criptográfica (Mín. 256 bits) |
| `JWT_EXPIRATION` | TTL do access token em ms (Default: `86400000` / 24h) |
| `JWT_REFRESH_EXPIRATION`| TTL do refresh token em ms (Default: `604800000` / 7d) |
| `GOOGLE_CLIENT_ID` | Client ID gerado no Google Cloud Console |
| `CORS_ALLOWED_ORIGINS` | URLs do frontend separadas por vírgula |
| `SENDGRID_API_KEY` | Chave da API SendGrid (usada via HTTPS para contornar bloqueios SMTP) |
| `SENDGRID_FROM` | Email remetente autorizado no painel SendGrid |
| `FRONTEND_URL` | URL base do client (usado em links de e-mail) |

### Frontend (`.env.local` / Vercel)
| Variável | Descrição |
|---|---|
| `NEXT_PUBLIC_API_URL` | Endereço público do Backend |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`| Mesmo Client ID usado no Backend |
| `GROQ_API_KEY` | Chave de API para o serviço Groq Cloud (Geração IA) |
| `JWT_SECRET` | Chave partilhada com o backend para validação local em *Server Actions* |

---

## 📄 Licença

Distribuído sob a licença MIT.
