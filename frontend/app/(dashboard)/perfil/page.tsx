"use client";

import { useState } from "react";
import { Bell, Settings, Flame, Trophy, Target, ChevronRight, ChevronDown, LogOut, Sparkles, User, Save, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useProgress } from "@/hooks/useProgress";
import type { TranslationDict } from "@/lib/translations";

type Section = "dados" | "objetivos" | "unidades" | null;

// Web Share API quando disponível (mobile, a maioria dos browsers modernos);
// clipboard como fallback (a maioria dos desktops) — nunca falha em silêncio.
async function shareApp(onCopied: () => void) {
  const shareData = {
    title: "FitAI",
    text: "Treino personalizado com IA. Bora treinar junto?",
    url: window.location.origin,
  };
  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch {
      // Usuário cancelou o share nativo — não é erro, não faz nada.
    }
    return;
  }
  await navigator.clipboard.writeText(shareData.url);
  onCopied();
}

// Chave canônica em português (bate com o backend/estado) — o rótulo exibido
// vem de t.objetivos[chave], nunca a chave crua.
const OBJETIVOS = ["Hipertrofia", "Força", "Resistência", "Emagrecimento", "Saúde geral"] as const;

// Rótulo de status para as conquistas: distingue "ainda carregando" e "falha ao
// carregar" do estado real (zerado ou não), que antes eram visualmente idênticos.
function statusLabel(loading: boolean, error: string | null, ready: string, t: TranslationDict) {
  if (loading) return t.perfil.carregando;
  if (error) return t.perfil.erroCarregarGenerico;
  return ready;
}

// Mesma distinção para os números grandes (Treinos/Volume/Horas): "…" enquanto
// carrega, "Erro" se a busca falhou, valor real (incluindo "—" de zero) caso contrário.
function statValue(loading: boolean, error: string | null, ready: string, t: TranslationDict) {
  if (loading) return "…";
  if (error) return t.perfil.erro;
  return ready;
}

export default function PerfilPage() {
  const { user, logout } = useAuth();
  const { locale, setLocale, t } = useLanguage();
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

  const [linkCopied, setLinkCopied] = useState(false);
  const [open, setOpen] = useState<Section>(null);
  const [nome, setNome] = useState(user?.name ?? "");
  const [email] = useState(user?.email ?? "");
  const [objetivo, setObjetivo] = useState<typeof OBJETIVOS[number]>("Hipertrofia");
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
    {
      icon: streak > 0
        ? <span className="flame-icon-wrap"><Flame size={16} color="var(--accent)" className="flame-icon" /></span>
        : <Flame size={16} color="var(--accent)" />,
      t: (progressLoading || progressError) ? t.perfil.streak : `${streak} ${t.perfil.diasStreak}`,
      s: statusLabel(progressLoading, progressError, streak > 0 ? t.perfil.emAndamento : t.perfil.comeceHoje, t),
      done: streak > 0,
    },
    { icon: <Trophy size={16} color="var(--accent)" />, t: t.perfil.dezTreinos, s: statusLabel(workoutsLoading, workoutsError, workouts.length >= 10 ? t.perfil.conquistado : `${workouts.length}/10`, t), done: workouts.length >= 10 },
    { icon: <Trophy size={16} color="var(--accent)" />, t: t.perfil.cinquentaTreinos, s: statusLabel(workoutsLoading, workoutsError, workouts.length >= 50 ? t.perfil.conquistado : `${workouts.length}/50`, t), done: workouts.length >= 50 },
    { icon: <Trophy size={16} color="var(--accent)" />, t: t.perfil.cemTreinos, s: statusLabel(workoutsLoading, workoutsError, workouts.length >= 100 ? t.perfil.conquistado : `${workouts.length}/100`, t), done: workouts.length >= 100 },
    { icon: <Target size={16} color="var(--accent)" />, t: t.perfil.primeiroTreino, s: statusLabel(workoutsLoading, workoutsError, workouts.length >= 1 ? t.perfil.conquistado : t.perfil.pendente, t), done: workouts.length >= 1 },
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
          <h1 className="page-title">{t.perfil.titulo}</h1>
          <div className="page-sub">{t.perfil.subtitulo}</div>
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
                  <span className="chip chip-accent row gap-2" style={{ alignItems: "center" }}>
                    {progressLoading
                      ? "…"
                      : progressError
                        ? t.perfil.erroStreak
                        : (
                          <>
                            {streak} {t.perfil.diasStreak}
                            {streak > 0 && (
                              <span className="flame-icon-wrap">
                                <Flame size={13} color="var(--accent)" className="flame-icon" fill="var(--accent)" />
                              </span>
                            )}
                          </>
                        )}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid-cols-3" style={{
              marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border-soft)",
              gap: 24,
            }}>
              <div>
                <div className="h-eyebrow">{t.perfil.lifetimeTreinos}</div>
                <div className="h-display" style={{ fontSize: 28, marginTop: 8 }}>
                  {statValue(workoutsLoading, workoutsError, String(workouts.length || "—"), t)}
                </div>
              </div>
              <div>
                <div className="h-eyebrow">{t.perfil.lifetimeVolume}</div>
                <div className="h-display" style={{ fontSize: 28, marginTop: 8 }}>
                  {statValue(workoutsLoading, workoutsError, totalVolume > 0 ? formatVolume(totalVolume) : "—", t)}
                  <span className="stat-unit">{workoutsReady && totalVolume > 0 ? "kg" : ""}</span>
                </div>
              </div>
              <div>
                <div className="h-eyebrow">{t.perfil.lifetimeHoras}</div>
                <div className="h-display" style={{ fontSize: 28, marginTop: 8 }}>
                  {statValue(workoutsLoading, workoutsError, totalHoras > 0 ? String(Math.round(totalHoras)) : "—", t)}
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
                <span style={{ color: "var(--danger)" }}>{t.perfil.erroCarregar}</span>
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={retry} disabled={retrying}>
                  <RefreshCw size={12} /> {retrying ? t.perfil.tentando : t.perfil.tentarNovamente}
                </button>
              </div>
            )}
          </div>

          {/* Conta */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-soft)" }}>
              <div className="h-eyebrow">{t.perfil.conta}</div>
            </div>

            {settingRow(t.perfil.dadosPessoais, <User size={18} />, "dados",
              <div className="col gap-3">
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>{t.perfil.nome}</label>
                  <input className="input" value={nome} onChange={e => setNome(e.target.value)} placeholder={t.perfil.seuNome} />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 6 }}>{t.perfil.email}</label>
                  <input className="input" value={email} disabled style={{ opacity: 0.5 }} />
                </div>
                <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-end" }} onClick={() => handleSave("dados")}>
                  {saved === "dados" ? <><Save size={13} /> {t.perfil.salvo}</> : <><Save size={13} /> {t.perfil.salvar}</>}
                </button>
              </div>
            )}

            {settingRow(t.perfil.objetivos, <Target size={18} />, "objetivos",
              <div className="col gap-3">
                <label style={{ fontSize: 12, color: "var(--text-dim)" }}>{t.perfil.objetivoPrincipal}</label>
                <div className="row gap-2" style={{ flexWrap: "wrap" }}>
                  {OBJETIVOS.map(o => (
                    <button
                      key={o}
                      className={`chip${objetivo === o ? " chip-accent" : ""}`}
                      style={{ height: 36, padding: "0 14px", cursor: "pointer" }}
                      onClick={() => setObjetivo(o)}
                    >
                      {t.objetivos[o]}
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary btn-sm" style={{ alignSelf: "flex-end" }} onClick={() => handleSave("objetivos")}>
                  {saved === "objetivos" ? <><Save size={13} /> {t.perfil.salvo}</> : <><Save size={13} /> {t.perfil.salvar}</>}
                </button>
              </div>
            )}

            {settingRow(t.perfil.unidades, <Settings size={18} />, "unidades",
              <div className="col gap-3">
                <label style={{ fontSize: 12, color: "var(--text-dim)" }}>{t.perfil.sistemaDeMedidas}</label>
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
                  {saved === "unidades" ? <><Save size={13} /> {t.perfil.salvo}</> : <><Save size={13} /> {t.perfil.salvar}</>}
                </button>
              </div>
            )}
          </div>

          {/* Aplicativo — Tema é decisão fixa do produto (DESIGN.md: tema
              escuro único), não setting pendente, por isso só mostra o
              valor. Idioma agora é de verdade (LanguageContext + localStorage).
              Notificações não tem infra no backend ainda: "Em breve" em vez
              de fingir que é uma feature pronta. */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-soft)" }}>
              <div className="h-eyebrow">{t.perfil.aplicativo}</div>
            </div>
            <div className="row gap-3" style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-soft)" }}>
              <span style={{ color: "var(--text-dim)" }}><Sparkles size={18} /></span>
              <div style={{ flex: 1, fontSize: 14 }}>{t.perfil.tema}</div>
              <span style={{ fontSize: 13, color: "var(--text-mute)" }}>{t.perfil.escuro}</span>
            </div>
            <div className="row gap-3" style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-soft)" }}>
              <span style={{ color: "var(--text-dim)" }}><Settings size={18} /></span>
              <div style={{ flex: 1, fontSize: 14 }}>{t.perfil.idioma}</div>
              <div className="row gap-1">
                <button
                  className={`chip${locale === "pt-BR" ? " chip-accent" : ""}`}
                  style={{ height: 26, padding: "0 10px", fontSize: 11, cursor: "pointer" }}
                  onClick={() => setLocale("pt-BR")}
                >
                  PT
                </button>
                <button
                  className={`chip${locale === "en" ? " chip-accent" : ""}`}
                  style={{ height: 26, padding: "0 10px", fontSize: 11, cursor: "pointer" }}
                  onClick={() => setLocale("en")}
                >
                  EN
                </button>
              </div>
            </div>
            <div className="row gap-3" style={{ padding: "14px 20px" }}>
              <span style={{ color: "var(--text-dim)" }}><Bell size={18} /></span>
              <div style={{ flex: 1, fontSize: 14 }}>{t.perfil.notificacoes}</div>
              <span style={{ fontSize: 13, color: "var(--text-mute)" }}>{t.perfil.emBreve}</span>
            </div>
          </div>

          <button
            className="btn btn-danger btn-block"
            style={{ justifyContent: "flex-start", gap: 12, padding: "14px 20px" }}
            onClick={logout}
          >
            <LogOut size={16} /> {t.perfil.sairDaConta}
          </button>
        </div>

        {/* Right col */}
        <div className="col-stack">
          {/* Único momento "peak" desta coluna — copy honesta (sem Plano Pro/
              recompensa fabricados): convite social puro, não referral pago. */}
          <div className="card card-accent" style={{ padding: 24 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "var(--accent-soft)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 16,
            }}>
              <Sparkles size={22} color="var(--accent)" />
            </div>
            <div className="h-display" style={{ fontSize: 26, marginBottom: 8 }}>{t.perfil.convideAmigos}</div>
            <div style={{ fontSize: 14, color: "var(--text-dim)", lineHeight: 1.55, marginBottom: 20 }}>
              {t.perfil.convideTexto}
            </div>
            <button
              className="btn btn-primary btn-block btn-lg"
              onClick={() => shareApp(() => {
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              })}
            >
              {linkCopied ? t.perfil.linkCopiado : t.perfil.compartilhar}
            </button>
          </div>

          {/* Conquistas */}
          <div className="card">
            <div className="h-eyebrow" style={{ marginBottom: 14 }}>{t.perfil.conquistas}</div>
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
