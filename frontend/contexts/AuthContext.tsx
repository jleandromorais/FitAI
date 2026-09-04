"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

interface AuthUser {
  name: string;
  email: string;
}

interface AuthSessionData {
  token: string;
  refreshToken: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  login: (data: AuthSessionData) => void;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: () => {},
  logout: () => {},
  refreshAccessToken: async () => false,
});

// Lê a sessão salva no localStorage. Executado apenas como lazy initializer
// do useState (nunca em efeito), pois é leitura síncrona de fonte externa.
// Guarda contra SSR, onde localStorage não existe.
function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const storedUser = localStorage.getItem("user");
  if (!storedUser) return null;
  try {
    return JSON.parse(storedUser);
  } catch {
    // "user" corrompido no localStorage — descarta a sessão em vez de quebrar
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return null;
  }
}

function readStoredToken(hasUser: boolean): string | null {
  if (typeof window === "undefined" || !hasUser) return null;
  return localStorage.getItem("token");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [token, setToken] = useState<string | null>(() => readStoredToken(user !== null));
  const router = useRouter();

  // Persiste a sessão E atualiza o estado do contexto na mesma chamada.
  // As páginas de login/registro escreviam direto no localStorage/cookie e só
  // navegavam depois (router.push) — como o AuthProvider vive no layout raiz e
  // não remonta numa navegação client-side, o estado "user" ficava preso em
  // null (o valor lido no primeiro mount, antes do login) até um reload real
  // forçar readStoredUser() a rodar de novo. Sidebar/Dashboard mostravam o
  // fallback genérico ("Usuário"/"atleta") até isso acontecer.
  const login = useCallback((data: AuthSessionData) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("refreshToken", data.refreshToken);
    const newUser = { name: data.name, email: data.email };
    localStorage.setItem("user", JSON.stringify(newUser));
    document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24}; SameSite=Strict`;
    setToken(data.token);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    document.cookie = "token=; path=/; max-age=0";
    setToken(null);
    setUser(null);
    router.push("/login");
  }, [router]);

  // Tenta renovar o access token usando o refresh token armazenado.
  // Retorna true em caso de sucesso, false se o refresh token expirou ou é inválido.
  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const storedRefresh = localStorage.getItem("refreshToken");
    if (!storedRefresh) return false;

    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: storedRefresh }),
      });

      if (!res.ok) {
        logout();
        return false;
      }

      const data = await res.json();
      localStorage.setItem("token", data.token);
      localStorage.setItem("refreshToken", data.refreshToken);
      // O backend também devolve name/email em /auth/refresh — sem persistir isso
      // aqui, um refresh silencioso (comum logo após o login, já que o access token
      // dura pouco) sobrescrevia token/refreshToken mas deixava "user" intocado.
      // Se por algum motivo "user" nunca existiu no localStorage, isso fazia a
      // sidebar cair no fallback genérico "Usuário" mesmo com a sessão válida.
      const updatedUser = { name: data.name, email: data.email };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      // O middleware (proxy.ts) decide com base neste cookie — sem atualizá-lo
      // aqui, ele expira (24h) mesmo com a sessão ainda válida via refresh token
      // e o utilizador é redirecionado para /login apesar de estar autenticado
      document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24}; SameSite=Strict`;
      setToken(data.token);
      setUser(updatedUser);
      return true;
    } catch {
      logout();
      return false;
    }
  }, [logout]);

  // lib/api.ts tenta renovar sozinho num 401 (token expirado); se o refresh
  // também falhar (refresh token expirado/inválido), ele dispara este evento
  // em vez de mexer no router diretamente — só o AuthContext sabe fazer
  // logout "de verdade" (limpar tudo de novo + mandar pro /login).
  useEffect(() => {
    function handleSessionExpired() {
      logout();
    }
    window.addEventListener("fitai:session-expired", handleSessionExpired);
    return () => window.removeEventListener("fitai:session-expired", handleSessionExpired);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, refreshAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
