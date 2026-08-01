"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { validateEmail, validatePassword } from "@/lib/validation";
import EffortLines from "@/components/ui/EffortLines";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

const MailSentIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 7 9-7" />
  </svg>
);

const CheckIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M8 12.5l2.5 2.5L16 9.5" />
  </svg>
);

// ── Etapa 1: solicitar o token de reset ──────────────────────────────────────

function ForgotStep() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [sent, setSent]       = useState(false);

  async function handleSubmit() {
    setError(null);
    const validation = validateEmail(email);
    if (!validation.valid) return setError(validation.error);

    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao solicitar reset.");
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <div className="auth-status-icon"><MailSentIcon /></div>
        <h2 className="h-display" style={{ fontSize: 22, marginBottom: 8 }}>
          Verifique seu e-mail
        </h2>
        <p style={{ color: "var(--text-dim)", fontSize: 14, lineHeight: 1.55 }}>
          Se este e-mail estiver cadastrado, enviamos um link para redefinir sua senha.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 className="h-display" style={{ fontSize: 24, marginBottom: 8 }}>
          Esqueceu a senha?
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.55 }}>
          Sem drama — informe seu e-mail e mandamos um link pra redefinir.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="input-with-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 7 9-7"/></svg>
          <input
            className="input"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            autoFocus
          />
        </div>

        {error && <p style={{ fontSize: 13, color: "var(--danger)", textAlign: "center" }}>{error}</p>}

        <button className="btn btn-primary btn-block btn-lg" onClick={handleSubmit} disabled={loading}>
          {loading ? "Enviando..." : "Solicitar reset →"}
        </button>
      </div>
    </div>
  );
}

// ── Etapa 2: digitar nova senha com o token recebido ─────────────────────────

function ResetStep({ token, email }: { token: string; email: string }) {
  const router                        = useRouter();
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);

  async function handleReset() {
    setError(null);
    const pv = validatePassword(password);
    if (!pv.valid) return setError(pv.error);
    if (password !== confirm) return setError("As senhas não coincidem.");

    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao redefinir senha.");
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={{ textAlign: "center", padding: "12px 0" }}>
        <div className="auth-status-icon auth-status-icon-gain"><CheckIcon /></div>
        <h2 className="h-display" style={{ fontSize: 22, marginBottom: 8 }}>
          Senha redefinida!
        </h2>
        <p style={{ color: "var(--text-dim)", fontSize: 14 }}>
          Redirecionando para o login...
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 className="h-display" style={{ fontSize: 24, marginBottom: 8 }}>
          Nova senha
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-dim)" }}>
          {email
            ? <>Defina uma nova senha para <strong style={{ color: "var(--text)" }}>{email}</strong>.</>
            : "Escolha uma senha nova pra continuar."}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="input-with-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
          <input
            className="input"
            type={showPassword ? "text" : "password"}
            placeholder="Nova senha (mín. 6 caracteres)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ paddingRight: 44 }}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            style={{
              position: "absolute", right: 12, background: "none", border: "none",
              color: "var(--text-mute)", cursor: "pointer", display: "flex",
            }}
          >
            {showPassword
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
          </button>
        </div>
        <div className="input-with-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
          <input
            className="input"
            type={showConfirm ? "text" : "password"}
            placeholder="Confirme a nova senha"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleReset()}
            style={{ paddingRight: 44 }}
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            aria-label={showConfirm ? "Ocultar confirmação de senha" : "Mostrar confirmação de senha"}
            style={{
              position: "absolute", right: 12, background: "none", border: "none",
              color: "var(--text-mute)", cursor: "pointer", display: "flex",
            }}
          >
            {showConfirm
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
          </button>
        </div>

        {error && <p style={{ fontSize: 13, color: "var(--danger)", textAlign: "center" }}>{error}</p>}

        <button className="btn btn-primary btn-block btn-lg" onClick={handleReset} disabled={loading}>
          {loading ? "Salvando..." : "Salvar nova senha →"}
        </button>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

function ResetSenhaForm() {
  const router           = useRouter();
  const searchParams     = useSearchParams();
  const tokenFromUrl     = searchParams.get("token");

  return (
    <div style={{ position: "relative", display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "32px 16px", overflow: "hidden" }}>
      <div className="auth-side-glow">
        <div className="auth-brand-glow" />
        <EffortLines />
      </div>

      <div className="anim-up" style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400 }}>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, justifyContent: "center" }}>
          <div className="sidebar-brand-mark" style={{ width: 36, height: 36, fontSize: 16 }}>F</div>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "var(--text)" }}>FitAI</span>
        </div>

        <div className="card" style={{ padding: 32 }}>
          {tokenFromUrl
            ? <ResetStep token={tokenFromUrl} email="" />
            : <ForgotStep />
          }
        </div>

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button type="button" onClick={() => router.push("/login")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-mute)" }}>
            ← Voltar ao login
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ResetSenhaPage() {
  return (
    <Suspense fallback={null}>
      <ResetSenhaForm />
    </Suspense>
  );
}
