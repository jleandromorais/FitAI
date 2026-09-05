# Documentação dos Testes — FitAI Frontend

## Visão geral

Foram implementados **61 testes** distribuídos em **7 arquivos**, cobrindo as camadas mais críticas do frontend: cliente HTTP, catálogo de dados, componentes de UI, autenticação, hooks de estado e rota de IA.

**Resultado:** 7/7 arquivos passando, 61/61 testes passando.

---

## Como rodar

```bash
# Roda todos os testes uma vez e exibe o resultado
npm test

# Modo watch — re-executa automaticamente ao salvar qualquer arquivo
npm run test:watch

# Gera relatório de cobertura de código em /coverage
npm run test:coverage
```

---

## Estrutura de arquivos

```
frontend/
├── vitest.config.ts          # Configuração do Vitest
├── vitest.setup.ts           # Setup global dos testes
└── __tests__/
    ├── lib/
    │   ├── api.test.ts
    │   └── exercises.test.ts
    ├── components/
    │   └── ui/
    │       ├── Button.test.tsx
    │       └── Input.test.tsx
    ├── contexts/
    │   └── AuthContext.test.tsx
    ├── hooks/
    │   └── useWorkouts.test.tsx
    └── app/
        └── ai-gen.test.tsx
```

---

## Ferramentas utilizadas

| Ferramenta | Versão | Para que serve |
|---|---|---|
| `vitest` | ^4 | Framework de testes (substitui Jest) |
| `@testing-library/react` | ^16 | Renderiza componentes React nos testes |
| `@testing-library/user-event` | ^14 | Simula ações do usuário (clique, digitação) |
| `@testing-library/jest-dom` | ^6 | Matchers extras como `toBeInTheDocument` |
| `@vitejs/plugin-react` | ^6 | Suporte a JSX/TSX no ambiente de teste |
| `jsdom` | ^29 | Simula o DOM do browser no Node.js |

---

## Detalhamento dos testes

---

### `__tests__/lib/api.test.ts` — 10 testes

Testa o cliente HTTP centralizado (`lib/api.ts`), que é responsável por toda comunicação com o backend.

**Por que é importante:** todos os hooks e páginas dependem desse módulo. Um bug aqui quebraria o app inteiro.

| Teste | O que verifica |
|---|---|
| Chama fetch com método GET e URL correta | O `api.get()` monta a URL completa `http://localhost:8081/caminho` |
| Inclui header Authorization com token | Quando há token no `localStorage`, injeta `Bearer <token>` automaticamente |
| Não inclui Authorization sem token | Não envia header Authorization quando o usuário não está logado |
| Retorna null em respostas 204 | Respostas sem corpo (ex: após deletar) retornam `null` sem erro |
| Lança erro com mensagem JSON (campo `message`) | Erros da API com `{ message: "..." }` viram `throw new Error(message)` |
| Lança erro com campo `error` do JSON | Erros com `{ error: "..." }` também são corretamente extraídos |
| Lança erro com status quando body não é JSON | Respostas HTML do Spring (ex: Whitelabel Error) ainda viram mensagens legíveis |
| POST serializa body corretamente | `api.post()` envia `method: "POST"` e `body: JSON.stringify(payload)` |
| PUT envia método e body corretos | `api.put()` envia `method: "PUT"` na URL com ID |
| DELETE envia método DELETE | `api.delete()` envia `method: "DELETE"` para a rota correta |

---

### `__tests__/lib/exercises.test.ts` — 7 testes

Testa o catálogo de 110 exercícios (`lib/exercises.ts`).

**Por que é importante:** o `NovoTreinoModal` e o `EditarTreinoModal` dependem desse catálogo para popular a lista de exercícios. Dados corrompidos causariam crash silencioso.

| Teste | O que verifica |
|---|---|
| Contém 9 grupos musculares | `MUSCLE_GROUPS` tem exatamente os 9 grupos esperados |
| `ALL_GROUPS` igual a `MUSCLE_GROUPS` | Os dois arrays exportados têm os mesmos grupos (um é `as const`, o outro mutável) |
| Tem pelo menos 40 exercícios | O catálogo não foi acidentalmente truncado |
| Todos os campos obrigatórios preenchidos | Nenhum exercício tem `name`, `muscle`, `group`, `defaultSets`, etc. vazio ou zero |
| Grupos dos exercícios são válidos | Nenhum exercício tem um grupo que não existe em `ALL_GROUPS` |
| Nenhum nome duplicado | Sem exercícios repetidos que causariam conflito de ID no modal |
| Cada grupo tem ao menos 3 exercícios | O usuário sempre tem opções em qualquer grupo que escolher |

---

### `__tests__/components/ui/Button.test.tsx` — 10 testes

Testa o componente `<Button>` que é usado em todo o app.

**Por que é importante:** é o componente mais reutilizado do projeto. Variantes erradas ou props ignoradas quebrariam a aparência de múltiplas telas.

| Teste | O que verifica |
|---|---|
| Renderiza o texto filho | O texto passado como `children` aparece no botão |
| Variant `primary` por padrão | Sem passar `variant`, aplica as classes do tema primário |
| Variant `outline` aplica classes corretas | Borda visível, fundo transparente |
| Variant `ghost` aplica classes corretas | Sem borda e sem fundo de destaque |
| `fullWidth` aplica `w-full` | Botão ocupa toda a largura do container quando solicitado |
| Sem `fullWidth`, não aplica `w-full` | Comportamento padrão: largura ajustada ao conteúdo |
| Mescla `className` externo | Classes passadas via prop não sobrescrevem nem somem |
| Chama `onClick` ao clicar | O callback é disparado corretamente |
| Não chama `onClick` quando `disabled` | Botão desabilitado bloqueia clique (comportamento nativo + segurança) |
| Passa `type` como atributo HTML | `type="submit"` funciona em formulários |

---

### `__tests__/components/ui/Input.test.tsx` — 10 testes

Testa o componente `<Input>` com suporte a ícone e elemento à direita.

**Por que é importante:** usado nos formulários de login, cadastro e nos modais de treino. Props ignoradas podem quebrar o layout ou impedir interação do usuário.

| Teste | O que verifica |
|---|---|
| Renderiza um campo `<input>` | Elemento de input existe na tela |
| Passa `placeholder` para o input | Texto de ajuda aparece no campo vazio |
| Renderiza o `icon` quando fornecido | Ícone à esquerda (ex: ícone de email) aparece |
| Aplica `pl-10` com ícone | Padding maior para o texto não sobrepor o ícone |
| Aplica `pl-4` sem ícone | Padding padrão quando não há ícone |
| Renderiza `rightElement` quando fornecido | Elemento à direita (ex: botão de mostrar senha) aparece |
| Mescla `className` externo | Classes adicionais não somem |
| Chama `onChange` ao digitar | Evento de digitação é disparado corretamente |
| Passa `type` correto | `type="password"` funciona (oculta o texto) |
| Funciona com valor controlado | `value` externo é exibido corretamente |

---

### `__tests__/contexts/AuthContext.test.tsx` — 5 testes

Testa o contexto de autenticação (`contexts/AuthContext.tsx`) que gerencia o estado de login em todo o app.

**Por que é importante:** o `useAuth()` é chamado em várias páginas para saber se o usuário está logado. Um bug aqui pode deixar o usuário preso na tela de login ou nunca redirecionar após o logout.

**Abordagem:** o `useRouter` do Next.js é mockado para capturar chamadas de redirecionamento sem precisar de um servidor Next rodando.

| Teste | O que verifica |
|---|---|
| Inicia com `user` e `token` nulos | Antes de qualquer login, o estado começa vazio |
| Carrega dados do `localStorage` na montagem | Se o usuário já estava logado antes (token salvo), o estado é restaurado |
| `logout` limpa o `localStorage` | Token e dados do usuário são removidos do storage |
| `logout` redireciona para `/login` | `router.push("/login")` é chamado após o logout |
| `logout` zera `user` e `token` no estado | A interface reage ao logout e o usuário some dos componentes |
| Não carrega se só tiver token (sem `user`) | Evita crash ao tentar parsear `JSON.parse(null)` |

---

### `__tests__/hooks/useWorkouts.test.tsx` — 13 testes

Testa os dois hooks de treinos: `useWorkouts()` (lista) e `useWorkout(id)` (individual).

**Por que é importante:** esses hooks são responsáveis por todo o CRUD de treinos. Bugs aqui fariam treinos não aparecerem, não salvarem ou não deletarem.

**Abordagem:** a `lib/api` é completamente mockada com `vi.mock()`, isolando os testes da rede.

#### `useWorkouts` — 8 testes

| Teste | O que verifica |
|---|---|
| Inicia com `loading=true` e lista vazia | Estado inicial correto antes da resposta da API |
| Carrega treinos com sucesso | Lista é populada e `loading` vira `false` |
| Seta `error` quando a API falha | Mensagem de erro é exposta via `error` state |
| `createWorkout` adiciona ao estado | Novo treino aparece na lista sem precisar recarregar |
| `updateWorkout` substitui no estado | Treino editado é substituído pelo retorno da API |
| `deleteWorkout` remove do estado | Treino deletado some da lista imediatamente |
| `reload` recarrega do servidor | Chama a API novamente e atualiza a lista |

#### `useWorkout(id)` — 5 testes

| Teste | O que verifica |
|---|---|
| Carrega treino por ID | Treino individual é buscado e exposto |
| Seta `error` quando não encontrado | Erro 404 resulta em mensagem no estado |
| `saveExercises` chama `PUT` correto | Atualiza via API com os exercícios novos |
| `saveExercises` atualiza o estado local | Treino no estado reflete os exercícios salvos |
| `saveExercises` não faz nada se `workout` é null | Previne chamada de API com ID inválido |

---

### `__tests__/app/ai-gen.test.tsx`

Testa a página `app/(dashboard)/ai-gen/page.tsx` — o wizard de geração de treino por IA.

**Por que é importante:** desde que a geração virou um pipeline assíncrono (Kafka + worker Node separado), essa página não chama mais IA diretamente: ela enfileira um job no backend Java (`POST /workout-generation-jobs`) e faz *polling* do status (`GET /workout-generation-jobs/{id}`) a cada 2s até `DONE`/`FAILED`. Falhas aqui poderiam deixar o usuário girando pra sempre num job travado ou perder o resultado gerado.

**Abordagem:** `lib/api` é mockado (`api.post`/`api.get`), não mais `fetch` cru — a chamada HTTP real vive dentro de `lib/api.ts`, já coberto por `lib/api.test.ts`. `vi.useFakeTimers()` com `vi.advanceTimersByTimeAsync` dirige tanto o ciclo de polling (2s) quanto o carrossel cosmético de mensagens (1800ms), que são independentes um do outro.

Cobre: enqueue com o payload correto, resposta imediata `FAILED` (sem pollar), transições `PENDING`/`PROCESSING`/`DONE`/`FAILED` via polling, o teto de ~60 tentativas (timeout), e o fluxo de salvar (`saveWorkouts`) inalterado a partir do estado `generatedWorkouts`.

---

## Configuração técnica

### `vitest.config.ts`

```ts
environment: "jsdom"   // Simula o DOM do browser
globals: true          // Permite usar describe/it/expect sem importar
setupFiles: ["./vitest.setup.ts"]  // Roda antes de cada arquivo de teste
```

O alias `@/*` espelha o `paths` do `tsconfig.json`, então imports como `@/lib/api` funcionam igual ao app real.

### `vitest.setup.ts`

```ts
import "@testing-library/jest-dom";
```

Adiciona matchers como `toBeInTheDocument()`, `toHaveAttribute()`, `toHaveClass()` a todos os testes.
