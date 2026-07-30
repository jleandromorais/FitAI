"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { validateEmail, validatePassword } from "@/lib/validation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

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
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          Verifique seu e-mail
        </h2>
        <p style={{ color: "var(--text-dim)", fontSize: 14 }}>
          Se este e-mail estiver cadastrado, enviamos um link para redefinir sua senha.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          Esqueceu a senha?
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.55 }}>
          Informe seu e-mail e receba um link para redefinir sua senha.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          className="input"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          autoFocus
        />

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
      <div style={{ textAlign: "center", padding: "20px 0" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
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
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
          Nova senha
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-dim)" }}>
          Defina uma nova senha para <strong style={{ color: "var(--text)" }}>{email}</strong>.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          className="input"
          type="password"
          placeholder="Nova senha (mín. 6 caracteres)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoFocus
        />
        <input
          className="input"
          type="password"
          placeholder="Confirme a nova senha"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleReset()}
        />

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
    <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: "32px 16px" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>

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
          <button onClick={() => router.push("/login")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-mute)" }}>
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
