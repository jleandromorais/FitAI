"use client";

import { useState } from "react";
import { Bell, Settings, Flame, Trophy, Target, ChevronRight, ChevronDown, LogOut, Sparkles, User, Save, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useProgress } from "@/hooks/useProgress";

type Section = "dados" | "objetivos" | "unidades" | null;

const OBJETIVOS = ["Hipertrofia", "Força", "Resistência", "Emagrecimento", "Saúde geral"];

// Rótulo de status para as conquistas: distingue "ainda carregando" e "falha ao
// carregar" do estado real (zerado ou não), que antes eram visualmente idênticos.
function statusLabel(loading: boolean, error: string | null, ready: string) {
  if (loading) return "Carregando…";
  if (error) return "Erro ao carregar";
  return ready;
}

// Mesma distinção para os números grandes (Treinos/Volume/Horas): "…" enquanto
// carrega, "Erro" se a busca falhou, valor real (incluindo "—" de zero) caso contrário.
function statValue(loading: boolean, error: string | null, ready: string) {
  if (loading) return "…";
  if (error) return "Erro";
  return ready;
}

export default function PerfilPage() {
  const { user, logout } = useAuth();
  const { workouts, loading: workoutsLoading, error: workoutsError, reload: reloadWorkouts } = useWorkouts();
  const { data: progress, loading: progressLoading, error: progressError, reload: reloadProgress } = useProgress();
  const streak = progress?.currentStreak ?? 0;
  const hasError = Boolean(workoutsError || progressError);

  // `reload()` clears `error` immediately (see useWorkouts/useProgress), so
  // `hasError` alone would flip false the instant retry is clicked — hiding
  // the banner (and its button) before the new fetch even resolves. `retrying`
  // keeps the banner visible with a disabled/loading button state until both
  // hooks have settled, so a slow or failing retry doesn't look like a no-op.
  // Cleared during render (padrão recomendado pelo React) em vez de useEffect,
  // mesmo truque do auto-close do menu mobile em Sidebar.tsx.
  const [retrying, setRetrying] = useState(false);
  const stillLoading = workoutsLoading || progressLoading;
  const [lastStillLoading, setLastStillLoading] = useState(stillLoading);
  if (stillLoading !== lastStillLoading) {
    setLastStillLoading(stillLoading);
    if (!stillLoading && retrying) setRetrying(false);
  }

  // Recriada a cada render de propósito: precisa ler workoutsError/progressError
  // frescos no momento do clique, não memoizar com deps vazias.
  function retry() {
    setRetrying(true);
    if (workoutsError) reloadWorkouts();
    if (progressError) reloadProgress();
  }

  const [open, setOpen] = useState<Section>(null);
  const [nome, setNome] = useState(user?.name ?? "");
  const [email] = useState(user?.email ?? "");
  const [objetivo, setObjetivo] = useState("Hipertrofia");
  const [unidade, setUnidade] = useState<"kg/cm" | "lbs/in">("kg/cm");
  const [saved, setSaved] = useState<Section>(null);

  const initials = user?.name
    ? user.name.split(" ").slice(0, 2).map(w => w[0].toUpperCase()).join("")
    : "?";

  // Prefere o volume real agregado do backend (progress.totalVolume) — mesmo
  // padrão do Dashboard (app/(dashboard)/page.tsx). O somatório de w.volume dos
  // templates de treino conta cada treino 1x só, não o histórico de sessões real.
  const totalVolume = progress?.totalVolume ?? workouts.reduce((sum, w) => sum + (w.volume ?? 0), 0);
  const totalHoras = workouts.reduce((sum, w) => sum + (w.duration ?? 0), 0) / 60;
  const workoutsReady = !workoutsLoading && !workoutsError;

  function formatVolume(v: number) {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
    return String(v);
  }

  function toggle(s: Section) {
    setOpen(prev => prev === s ? null : s);
    setSaved(null);
  }

  function handleSave(s: Section) {
    setSaved(s);
    setTimeout(() => setSaved(null), 2000);
  }

  const conquistas = [
    { icon: <Flame size={16} color="var(--accent)" />, t: (progressLoading || progressError) ? "Streak" : `${streak} dias streak`, s: statusLabel(progressLoading, progressError, streak > 0 ? "Em andamento" : "Comece hoje"), done: streak > 0 },
    { icon: <Trophy size={16} color="var(--accent)" />, t: "10 treinos", s: statusLabel(workoutsLoading, workoutsError, workouts.length >= 10 ? "Conquistado" : `${workouts.length}/10`), done: workouts.length >= 10 },
    { icon: <Trophy size={16} color="var(--accent)" />, t: "50 treinos", s: statusLabel(workoutsLoading, workoutsError, workouts.length >= 50 ? "Conquistado" : `${workouts.length}/50`), done: workouts.length >= 50 },
    { icon: <Trophy size={16} color="var(--accent)" />, t: "100 treinos", s: statusLabel(workoutsLoading, workoutsError, workouts.length >= 100 ? "Conquistado" : `${workouts.length}/100`), done: workouts.length >= 100 },
    { icon: <Target size={16} color="var(--accent)" />, t: "Primeiro treino", s: statusLabel(workoutsLoading, workoutsError, workouts.length >= 1 ? "Conquistado" : "Pendente"), done: workouts.length >= 1 },
  ];

  const settingRow = (label: string, icon: React.ReactNode, key: Section, children: React.ReactNode) => (
    <div key={label}>
      <div
        className="row gap-3"
        style={{ padding: "14px 20px", cursor: "pointer", borderBottom: open === key ? "none" : "1px solid var(--border-soft)" }}
        onClick={() => toggle(key)}
      >
        <span style={{ color: "var(--text-dim)" }}>{icon}</span>
        <div style={{ flex: 1, fontSize: 14 }}>{label}</div>
        {open === key ? <ChevronDown size={16} color="var(--text-mute)" /> : <ChevronRight size={16} color="var(--text-mute)" />}
      </div>
      {open === key && (
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-soft)", borderBottom: "1px solid var(--border-soft)", background: "var(--surface-1)" }}>
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="anim-up">
      <div className="page-head">
        <div>
          <h1 className="page-title">Perfil</h1>
          <div className="page-sub">Conta, preferências e estatísticas</div>
        </div>
      </div>

      <div className="grid-3">
        <div className="col-stack">
          {/* User card */}
          <div className="card" style={{ padding: 28 }}>
            <div className="row gap-4" style={{ flexWrap: "wrap" }}>
              <div className="avatar" style={{ width: 72, height: 72, fontSize: 24 }}>{initials}</div>
              <div style={{ flex: 1 }}>
                <div className="h-display" style={{ fontSize: 24 }}>{user?.name ?? "—"}</div>
                <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>{user?.email ?? "—"}</div>
                <div className="row gap-2" style={{ marginTop: 10 }}>
                  <span className="chip chip-accent">Plano Pro</span>
                  <span className="chip">
                    {progressLoading ? "…" : progressError ? "Erro ao carregar streak" : `${streak} dias streak 🔥`}
                  </span>
                </div>
              </div>
              <div className="col gap-2" style={{ alignItems: "flex-end" }}>
                <div style={{ fontSize: 11, color: "var(--text-mute)" }}>Renovação em 12 dias</div>
                <button className="btn btn-secondary btn-sm">Gerenciar plano</button>
              </div>
            </div>

            <div className="grid-cols-3" style={{
              marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border-soft)",
              gap: 24,
            }}>
              <div>
                <div className="h-eyebrow">Lifetime · Treinos</div>
                <div className="h-display" style={{ fontSize: 28, marginTop: 8 }}>
                  {statValue(workoutsLoading, workoutsError, String(workouts.length || "—"))}
                </div>
              </div>
              <div>
                <div className="h-eyebrow">Lifetime · Volume</div>
                <div className="h-display" style={{ fontSize: 28, marginTop: 8 }}>
                  {statValue(workoutsLoading, workoutsError, totalVolume > 0 ? formatVolume(totalVolume) : "—")}
                  <span className="stat-unit">{workoutsReady && totalVolume > 0 ? "kg" : ""}</span>
                </div>
              </div>
              <div>
                <div className="h-eyebrow">Lifetime · Horas</div>
                <div className="h-display" style={{ fontSize: 28, marginTop: 8 }}>
                  {statValue(workoutsLoading, workoutsError, totalHoras > 0 ? String(Math.round(totalHoras)) : "—")}
                  <span className="stat-unit">{workoutsReady && totalHoras > 0 ? "h" : ""}</span>
                </div>
              </div>
            </div>

            {(hasError || retrying) && (
              <div role="alert" style={{
                marginTop: 16, padding: "10px 14px", borderRadius: 10,
                background: "rgba(255,59,48,0.1)", border: "1px solid rgba(255,59,48,0.3)",
                display: "flex", alignItems: "center", gap: 10, fontSize: 13,
              }}>
                <AlertCircle size={16} color="var(--danger)" />
                <span style={{ color: "var(--danger)" }}>Algumas informações não puderam ser carregadas.</span>
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={retry} disabled={retrying}>
                  <RefreshCw size={12} /> {retrying ? "Tentando…" : "Tentar novamente"}
                </button>
              </div>
            )}
          </div>

          {/* Conta */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-soft)" }}>
              <div className="h-eyebrow">Conta</div>
            </div>

            {settingRow("Dados pessoais", <User size={18} />, "dados",
              <div className="col gap-3">
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Nome</label>
                  <input className="input" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>Email</label>
                  <input className="input" value={email} disabled style={{ opacity: 0.5 }} />
                </div>
                <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-end" }} onClick={() => handleSave("dados")}>
                  {saved === "dados" ? <><Save size={13} /> Salvo!</> : <><Save size={13} /> Salvar</>}
                </button>
              </div>
            )}

            {settingRow("Objetivos", <Target size={18} />, "objetivos",
              <div className="col gap-3">
                <label style={{ fontSize: 12, color: "var(--text-dim)" }}>Objetivo principal</label>
                <div className="row gap-2" style={{ flexWrap: "wrap" }}>
                  {OBJETIVOS.map(o => (
                    <button
                      key={o}
                      className={`chip${objetivo === o ? " chip-accent" : ""}`}
                      style={{ height: 36, padding: "0 14px", cursor: "pointer" }}
                      onClick={() => setObjetivo(o)}
                    >
                      {o}
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-end" }} onClick={() => handleSave("objetivos")}>
                  {saved === "objetivos" ? <><Save size={13} /> Salvo!</> : <><Save size={13} /> Salvar</>}
                </button>
              </div>
            )}

            {settingRow("Unidades (kg / cm)", <Settings size={18} />, "unidades",
              <div className="col gap-3">
                <label style={{ fontSize: 12, color: "var(--text-dim)" }}>Sistema de medidas</label>
                <div className="row gap-3">
                  {(["kg/cm", "lbs/in"] as const).map(u => (
                    <button
                      key={u}
                      className={`chip${unidade === u ? " chip-accent" : ""}`}
                      style={{ height: 36, padding: "0 18px", cursor: "pointer" }}
                      onClick={() => setUnidade(u)}
                    >
                      {u}
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-end" }} onClick={() => handleSave("unidades")}>
                  {saved === "unidades" ? <><Save size={13} /> Salvo!</> : <><Save size={13} /> Salvar</>}
                </button>
              </div>
            )}
          </div>

          {/* Aplicativo */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-soft)" }}>
              <div className="h-eyebrow">Aplicativo</div>
            </div>
            {[["Tema", <Sparkles key="sp" size={18} />], ["Idioma", <Settings key="s2" size={18} />], ["Notificações", <Bell key="b" size={18} />]].map(([label, icon], i, arr) => (
              <div key={label as string} className="row gap-3" style={{
                padding: "14px 20px", cursor: "pointer",
                borderBottom: i < arr.length - 1 ? "1px solid var(--border-soft)" : "none",
              }}>
                <span style={{ color: "var(--text-dim)" }}>{icon}</span>
                <div style={{ flex: 1, fontSize: 14 }}>{label}</div>
                <ChevronRight size={16} color="var(--text-mute)" />
              </div>
            ))}
          </div>

          <button
            className="btn btn-danger btn-block"
            style={{ justifyContent: "flex-start", gap: 12, padding: "14px 20px" }}
            onClick={logout}
          >
            <LogOut size={16} /> Sair da conta
          </button>
        </div>

        {/* Right col */}
        <div className="col-stack">
          <div className="card card-accent">
            <Sparkles size={20} color="var(--accent)" />
            <div className="h-display" style={{ fontSize: 18, marginTop: 12, marginBottom: 6 }}>Convide amigos</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.5, marginBottom: 16 }}>
              Ganhe 1 mês Pro para cada amigo que assinar.
            </div>
            <button className="btn btn-primary btn-block btn-sm">Convidar</button>
          </div>

          {/* Conquistas */}
          <div className="card">
            <div className="h-eyebrow" style={{ marginBottom: 14 }}>Conquistas</div>
            <div className="col gap-3">
              {conquistas.map((a, i) => (
                <div key={i} className="row gap-3">
                  <div style={{
                    width: 36, height: 36, borderRadius: 9,
                    background: a.done ? "var(--accent-soft)" : "var(--surface-2)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    opacity: a.done ? 1 : 0.4,
                  }}>{a.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, opacity: a.done ? 1 : 0.5 }}>{a.t}</div>
                    <div style={{ fontSize: 11, color: a.done ? "var(--accent)" : "var(--text-mute)", marginTop: 2 }}>{a.s}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
