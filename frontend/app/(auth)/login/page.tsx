"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import EffortLines from "@/components/ui/EffortLines";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

function saveSession(data: { token: string; refreshToken: string; name: string; email: string }) {
  localStorage.setItem("token", data.token);
  localStorage.setItem("refreshToken", data.refreshToken);
  localStorage.setItem("user", JSON.stringify({ name: data.name, email: data.email }));
  document.cookie = `token=${data.token}; path=/; max-age=${60 * 60 * 24}; SameSite=Strict`;
}

// Componente separado para usar useSearchParams dentro do Suspense
function LoginForm() {
  const router = useRouter();
  // Se o middleware redirecionou de uma rota protegida, volta para lá após login
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/";
  const [tab, setTab] = useState<"entrar" | "criar">("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (tab === "criar") {
      if (!name.trim()) return setError("Informe seu nome.");
      if (password !== confirmPassword) return setError("As senhas não coincidem.");
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}${tab === "entrar" ? "/auth/login" : "/auth/register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tab === "entrar" ? { email, password } : { name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao autenticar.");
      saveSession(data);
      router.push(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle(credentialResponse: { credential?: string }) {
    if (!credentialResponse.credential) return setError("Token do Google não recebido.");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: credentialResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Falha no Google login.");
      saveSession(data);
      router.push(redirectTo);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Coluna esquerda: branding ── */}
      <div className="auth-brand hidden lg:flex">
        <div className="auth-brand-glow" />
        <EffortLines />

        <div className="auth-brand-content">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="sidebar-brand-mark" style={{ width: 40, height: 40, fontSize: 18 }}>F</div>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "var(--text)" }}>
              FitAI
            </span>
          </div>
        </div>

        {/* Frase */}
        <div className="auth-brand-content">
          <h1 style={{
            fontFamily: "var(--font-display)", fontSize: 42, fontWeight: 700,
            color: "var(--text)", lineHeight: 1.15, marginBottom: 20,
          }}>
            Cada série te leva<br />mais <span className="flame-word">perto do limite.</span>
          </h1>
          <p style={{ color: "var(--text-dim)", fontSize: 16, lineHeight: 1.65, maxWidth: 420 }}>
            Treinos personalizados com inteligência artificial para você evoluir todos os dias.
          </p>

          {/* Stats decorativos */}
          <div style={{ display: "flex", gap: 32, marginTop: 40 }}>
            {[["+12k", "Usuários ativos"], ["94%", "Taxa de adesão"], ["3.2x", "Mais resultados"]].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: "var(--accent)" }}>{v}</div>
                <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="auth-brand-content" style={{ fontSize: 12, color: "var(--text-mute)" }}>© 2026 FitAI. Todos os direitos reservados.</p>
      </div>

      {/* ── Coluna direita: formulário ── */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "48px 32px",
      }}>
        <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 24 }}>

          {/* Header */}
          <div>
            <h2 className="h-display" style={{ fontSize: 28 }}>
              {tab === "entrar" ? "Bem-vindo de volta." : "Comece sua jornada."}
            </h2>
            <p style={{ color: "var(--text-dim)", marginTop: 6, fontSize: 14 }}>
              {tab === "entrar"
                ? "Continue de onde parou no seu treino."
                : "Treinos personalizados pela IA."}
            </p>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <div className={`tab${tab === "entrar" ? " active" : ""}`}
              onClick={() => { setTab("entrar"); setError(null); }}>
              Entrar
            </div>
            <div className={`tab${tab === "criar" ? " active" : ""}`}
              onClick={() => { setTab("criar"); setError(null); }}>
              Criar conta
            </div>
          </div>

          {/* Campos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tab === "criar" && (
              <div className="input-with-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/></svg>
                <input className="input" placeholder="Seu nome completo" value={name} onChange={e => setName(e.target.value)} />
              </div>
            )}

            <div className="input-with-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>
              <input className="input" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="input-with-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                <input className="input" type={showPassword ? "text" : "password"} placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: 44 }} />
                <button onClick={() => setShowPassword(!showPassword)} style={{
                  position: "absolute", right: 12, background: "none", border: "none",
                  color: "var(--text-mute)", cursor: "pointer", display: "flex",
                }}>
                  {showPassword
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
              {tab === "entrar" && (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => router.push("/reset-senha")} style={{ fontSize: 12, color: "var(--text-mute)", background: "none", border: "none", cursor: "pointer" }}>
                    Esqueci a senha
                  </button>
                </div>
              )}
            </div>

            {tab === "criar" && (
              <div className="input-with-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                <input className="input" type={showConfirm ? "text" : "password"} placeholder="Confirme sua senha"
                  value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  style={{ paddingRight: 44 }} />
                <button onClick={() => setShowConfirm(!showConfirm)} style={{
                  position: "absolute", right: 12, background: "none", border: "none",
                  color: "var(--text-mute)", cursor: "pointer", display: "flex",
                }}>
                  {showConfirm
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            )}

            {error && (
              <p style={{ fontSize: 13, color: "var(--danger)", textAlign: "center", padding: "8px 0" }}>{error}</p>
            )}

            <button
              className="btn btn-primary btn-block btn-lg"
              style={{ marginTop: 4 }}
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Aguarde..." : tab === "entrar" ? "Entrar →" : "Criar conta →"}
            </button>
          </div>

          {/* Divisor */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span style={{ fontSize: 11, color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              ou continue com
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          </div>

          {/* Google */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <GoogleLogin
              onSuccess={handleGoogle}
              onError={() => setError("Login com Google cancelado ou falhou.")}
              theme="filled_black"
              shape="rectangular"
              size="large"
              width="420"
            />
          </div>

          <p style={{ fontSize: 11, textAlign: "center", color: "var(--text-mute)" }}>
            Ao continuar, você concorda com os{" "}
            <span style={{ color: "var(--accent)", cursor: "pointer" }}>Termos</span>{" "}
            e{" "}
            <span style={{ color: "var(--accent)", cursor: "pointer" }}>Política de Privacidade</span>.
          </p>
        </div>
      </div>
    </div>
  );
}

// Página exportada envolve o formulário em Suspense (obrigatório para useSearchParams no Next.js 13+)
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
