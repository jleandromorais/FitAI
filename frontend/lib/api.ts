// URL base da API. Usa variável de ambiente ou fallback para localhost.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

// Lê o token JWT do localStorage (retorna null no servidor, pois não há window).
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

// Troca o refresh token por um access token novo — mesma chamada que
// AuthContext.refreshAccessToken() faz, mas aqui é usada automaticamente
// quando uma requisição volta 401 (access token expirado, 24h por defeito),
// já que este módulo não tem acesso ao contexto React pra chamar aquela
// função diretamente. Escreve direto no localStorage/cookie, igual ao
// AuthContext, pra manter as duas fontes de verdade em sincronia.
async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const storedRefresh = localStorage.getItem("refreshToken");
  if (!storedRefresh) return null;

  try {
    const res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: storedRefresh }),
    });
    if (!res.ok) return null;

    const data = await res.json();
    localStorage.setItem("token", data.token);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user", JSON.stringify({ name: data.name, email: data.email }));
    document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24}; SameSite=Strict`;
    return data.token as string;
  } catch {
    return null;
  }
}

// Limpa a sessão local e avisa o AuthContext (via evento, já que este módulo
// não tem acesso ao router) pra fazer logout de verdade e mandar pro /login.
function clearSessionAndNotify() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  document.cookie = "token=; path=/; max-age=0";
  window.dispatchEvent(new Event("fitai:session-expired"));
}

// Função central de requisição. Todas as chamadas da API passam por aqui.
// `isRetry` evita um segundo refresh (e um loop infinito) se a requisição
// repetida com o token novo também vier 401.
async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      // Injeta o header de autenticação apenas se o token existir.
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      // Headers extras passados pelo chamador têm prioridade.
      ...options.headers,
    },
  });

  // 401 é o access token expirado/inválido — tenta renovar e repetir a
  // requisição original uma vez antes de desistir e tratar como erro normal.
  if (res.status === 401 && !isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) return request<T>(path, options, true);
    clearSessionAndNotify();
  }

  // Tratamento de erro HTTP (4xx / 5xx).
  if (!res.ok) {
    const body = await res.text();
    let message = `Erro ${res.status}`;
    try {
      // Tenta extrair a mensagem de erro de um corpo JSON.
      const json = JSON.parse(body);
      message = json.message || json.error || message;
    } catch {
      // Corpo não é JSON (ex: página HTML do Spring Whitelabel Error).
      // Usa os primeiros 120 caracteres do texto para diagnóstico.
      if (body) message = `Erro ${res.status}: ${body.slice(0, 120)}`;
    }
    throw new Error(message);
  }

  // 204 No Content: sem corpo para deserializar.
  if (res.status === 204) return null as T;

  // Deserializa e retorna o JSON da resposta.
  return res.json();
}

// Objeto público com os métodos HTTP mais comuns.
// O tipo genérico T define o formato esperado da resposta.
export const api = {
  get:    <T>(path: string)                => request<T>(path),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: "POST",   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => request<T>(path, { method: "PUT",    body: JSON.stringify(body) }),
  delete: <T>(path: string)                => request<T>(path, { method: "DELETE" }),
};
