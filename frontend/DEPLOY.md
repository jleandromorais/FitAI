# Deploy — Frontend no Vercel

## Pré-requisitos

- Conta na [Vercel](https://vercel.com) (gratuita)
- Repositório no GitHub com o código do projeto
- Backend rodando (URL pública — ex: Railway)

---

## Passo a passo

### 1. Fazer push do código para o GitHub

```bash
git add .
git commit -m "chore: prepare frontend for Vercel deploy"
git push origin main
```

---

### 2. Importar o projeto na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new)
2. Clique em **"Import Git Repository"**
3. Selecione o repositório `fitai-monorepo`
4. Em **"Root Directory"**, clique em **Edit** e digite: `frontend`
5. Framework será detectado automaticamente como **Next.js**
6. Clique em **"Environment Variables"** e adicione as variáveis abaixo

---

### 3. Configurar variáveis de ambiente na Vercel

Na tela de configuração do projeto (antes do primeiro deploy), adicione:

| Nome | Valor | Descrição |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://seu-backend.railway.app` | URL do backend em produção |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `seu-client-id.apps.googleusercontent.com` | Google OAuth2 Client ID |

> **Atenção:** variáveis prefixadas com `NEXT_PUBLIC_` são expostas no browser.
> A geração de treino por IA não roda mais no frontend — o frontend só enfileira o job no backend Java (`POST /workout-generation-jobs`) e faz polling do status. A chave da IA (`GROQ_API_KEY`) vive só no serviço `worker` (Node.js), não na Vercel.

---

### 4. Fazer o deploy

Clique em **"Deploy"**. A Vercel vai:
1. Instalar dependências (`npm install`)
2. Fazer o build (`npm run build`)
3. Publicar em `https://seu-projeto.vercel.app`

O deploy leva cerca de 1-2 minutos.

---

### 5. Configurar domínio do Google OAuth2

Após o deploy, você precisa adicionar a URL do Vercel como origem autorizada no Google:

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Vá em **APIs e Serviços → Credenciais**
3. Clique na credencial OAuth2 que você usa
4. Em **"Origens JavaScript autorizadas"**, adicione:
   - `https://seu-projeto.vercel.app`
5. Em **"URIs de redirecionamento autorizados"**, adicione:
   - `https://seu-projeto.vercel.app`
6. Salve e aguarde alguns minutos para propagar

---

### 6. Configurar CORS no backend

O backend precisa aceitar requisições da URL do Vercel. Atualize a variável de ambiente do backend:

```
CORS_ALLOWED_ORIGINS=https://seu-projeto.vercel.app
```

Se ainda não tiver o backend em produção, pode colocar o valor temporariamente em `application.properties`:

```properties
cors.allowed-origins=https://seu-projeto.vercel.app,http://localhost:3000
```

---

## Deploys automáticos

A Vercel faz deploy automaticamente a cada `git push origin main`. Para desativar deploys automáticos de branches específicas, configure em **Settings → Git → Ignored Build Step**.

---

## Variáveis por ambiente

A Vercel suporta variáveis diferentes por ambiente (Production, Preview, Development). Acesse **Settings → Environment Variables** para gerenciar.

| Ambiente | Quando usa |
|---|---|
| **Production** | Branch `main` → URL principal |
| **Preview** | Pull Requests → URL temporária por PR |
| **Development** | `vercel dev` local |

---

## Verificar se funcionou

Após o deploy:

1. Acesse `https://seu-projeto.vercel.app`
2. Tente fazer login
3. Crie um treino
4. Verifique os logs em **Vercel → Deployments → Functions** se algo der errado

---

## Problemas comuns

| Problema | Causa provável | Solução |
|---|---|---|
| Tela branca / erro 500 | Variável de ambiente faltando | Verificar se todas as vars estão configuradas na Vercel |
| Login Google não funciona | Origem não autorizada | Adicionar URL do Vercel no console do Google |
| API retorna erro CORS | Backend não aceita a origem | Atualizar `CORS_ALLOWED_ORIGINS` no backend |
| Build falha | Erro de TypeScript | Rodar `npm run build` localmente antes de fazer push |
