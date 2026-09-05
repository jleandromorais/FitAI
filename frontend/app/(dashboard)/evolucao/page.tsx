"use client";

/*
 * /evolucao — Evolução física. Página própria no route group (dashboard), já
 * protegida pelo proxy.ts (cookie `token`), fora do gate `hasWorkoutData` de
 * /progresso: registrar peso ou uma meta não depende de ter treinado.
 *
 * MOTION — herda o vocabulário "Combustão" (scale 0.97 no active, count-up em
 * mono que assenta pra display, pulse). Um único gesto de troca de sub-aba
 * (evoPanelIn: fade + slide de 6px, key={tab} remonta). Momento autoral: a
 * barra da Meta (início→atual→alvo) varre até a posição atual e o marcador
 * viaja o trilho, uma vez, ao montar — dramatiza a regra "meta atingida vem
 * da verdade". Tudo respeita prefers-reduced-motion (globals.css).
 *
 * As 4 sub-abas seguem o idioma visual de /progresso: .tabs/.tab, page-head,
 * estados de loading/erro com role="status"/aria-live.
 */

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBodyMeasurements } from "@/hooks/useBodyMeasurements";
import { useWeightGoals } from "@/hooks/useWeightGoals";
import EvolucaoResumo from "@/components/ui/EvolucaoResumo";
import FotosTab from "@/components/ui/FotosTab";
import MedidasTab from "@/components/ui/MedidasTab";
import MetaTab from "@/components/ui/MetaTab";

type Tab = "evolucao" | "fotos" | "medidas" | "meta";

export default function EvolucaoPage() {
  const { t } = useLanguage();
  const measurements = useBodyMeasurements();
  const goals = useWeightGoals();

  const [tab, setTab] = useState<Tab>("evolucao");

  const loading = measurements.loading || goals.loading;
  const error = measurements.error || goals.error;

  function retry() {
    measurements.reload();
    goals.reload();
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, minHeight: 400 }}
      >
        <Loader2 size={36} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
        <span style={{ fontSize: 13, color: "var(--text-dim)" }}>{t.evolucao.carregando}</span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Erro ───────────────────────────────────────────────────────────────────
  if (error) {
    console.error("[Evolução] erro ao carregar medidas/metas:", error);
    return (
      <div className="anim-up">
        <div className="page-head">
          <div>
            <h1 className="page-title">{t.evolucao.titulo}</h1>
          </div>
        </div>
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div className="auth-status-icon auth-status-icon-danger" style={{ margin: "0 auto 16px" }}>
            <AlertTriangle size={22} />
          </div>
          <div className="h-display" style={{ fontSize: 18, marginBottom: 8 }}>{t.evolucao.erroTitulo}</div>
          <p style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 24 }}>{t.evolucao.erroTexto}</p>
          <button className="btn btn-secondary" onClick={retry}>{t.evolucao.tentarNovamente}</button>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const TABS: [Tab, string][] = [
    ["evolucao", t.evolucao.abaEvolucao],
    ["fotos", t.evolucao.abaFotos],
    ["medidas", t.evolucao.abaMedidas],
    ["meta", t.evolucao.abaMeta],
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="anim-up">
      <div className="page-head">
        <div>
          <h1 className="page-title">{t.evolucao.titulo}</h1>
          <div className="page-sub">{t.evolucao.subtitulo}</div>
        </div>

        {/* aria-controls/id ligam cada botão ao seu painel (mesmo bloco a11y de /progresso) */}
        <div className="tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button
              key={id}
              id={`tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              className={`tab${tab === id ? " active" : ""}`}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div key={tab} className="evo-panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "evolucao" && (
          <EvolucaoResumo
            measurements={measurements.measurements}
            goals={goals.goals}
            onGoToFotos={() => setTab("fotos")}
          />
        )}
        {tab === "fotos" && <FotosTab />}
        {tab === "medidas" && (
          <MedidasTab
            measurements={measurements.measurements}
            create={measurements.create}
            remove={measurements.remove}
            onChanged={goals.reload}
          />
        )}
        {tab === "meta" && (
          <MetaTab goals={goals.goals} create={goals.create} remove={goals.remove} />
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
