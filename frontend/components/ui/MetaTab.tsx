"use client";

import { useState, type CSSProperties } from "react";
import { Loader2, Target, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { labelStyle } from "@/lib/workout-shared";
import type { NewWeightGoal, WeightGoal } from "@/hooks/useWeightGoals";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string, locale: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

function ptNum(n: number, digits = 1): string {
  return n.toFixed(digits).replace(".", ",");
}

function parseNum(s: string): number | null {
  const n = Number(s.replace(",", "."));
  return s.trim() === "" || Number.isNaN(n) ? null : n;
}

/** Fração 0–1 de "quão perto do alvo" — clampada. achieved sempre 1. */
function progress(goal: WeightGoal): number {
  if (goal.achieved) return 1;
  const { startWeightKg: s, currentWeightKg: c, targetWeightKg: tgt } = goal;
  if (s == null || c == null || s === tgt) return 0;
  return Math.max(0, Math.min(1, (c - s) / (tgt - s)));
}

interface Props {
  goals: WeightGoal[];
  create: (body: NewWeightGoal) => Promise<WeightGoal>;
  remove: (id: number) => Promise<void>;
}

export default function MetaTab({ goals, create, remove }: Props) {
  const { t, locale } = useLanguage();

  const [target, setTarget] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetNum = parseNum(target);
  const canSave = targetNum != null && !saving;

  async function handleSave() {
    if (targetNum == null) return;
    setSaving(true);
    setError(null);
    try {
      await create({ targetWeightKg: targetNum, targetDate: targetDate || null });
      setTarget("");
      setTargetDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.evolucao.erroSalvar);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(g: WeightGoal) {
    if (!window.confirm(t.evolucao.apagarMeta)) return;
    await remove(g.id);
  }

  return (
    <div className="col gap-4">
      {/* Definir meta */}
      <div className="card anim-up">
        <div className="h-eyebrow" style={{ marginBottom: 16 }}>{t.evolucao.metaPeso}</div>
        <div className="row gap-3" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={labelStyle}>{t.evolucao.pesoAlvo} (kg)</label>
            <input
              className="input" type="number" inputMode="decimal" min={20} max={500} step={0.1}
              style={{ maxWidth: 120 }} value={target} onChange={e => setTarget(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>{t.evolucao.dataAlvo} · {t.evolucao.opcional}</label>
            <input
              className="input" type="date" min={todayISO()}
              style={{ maxWidth: 170 }} value={targetDate} onChange={e => setTargetDate(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-primary" disabled={!canSave} onClick={handleSave}>
            {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Target size={16} />}
            {t.evolucao.definirMeta}
          </button>
        </div>
        {error && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 12 }}>{error}</p>}
      </div>

      {/* Metas */}
      {goals.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--text-mute)", fontSize: 13 }}>{t.evolucao.nenhumaMeta}</p>
        </div>
      ) : (
        goals.map(g => {
          const pos = `${(progress(g) * 100).toFixed(1)}%`;
          const gap = g.currentWeightKg != null ? Math.abs(g.currentWeightKg - g.targetWeightKg) : null;
          return (
            <div key={g.id} className={`card${g.achieved ? " card-gain" : ""}`}>
              <div className="row between" style={{ alignItems: "flex-start" }}>
                <div>
                  <div className="h-eyebrow">{t.evolucao.pesoAlvo}</div>
                  <div className="h-display" style={{ fontSize: 24, marginTop: 4 }}>
                    {ptNum(g.targetWeightKg)}<span className="stat-unit" style={{ fontSize: 14 }}>kg</span>
                  </div>
                  {g.targetDate && (
                    <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>
                      {t.evolucao.dataAlvo}: {fmtDate(g.targetDate, locale)}
                    </div>
                  )}
                </div>
                <button type="button" className="icon-btn" aria-label={t.evolucao.apagarMeta} onClick={() => handleDelete(g)}>
                  <Trash2 size={14} />
                </button>
              </div>

              {g.startWeightKg == null ? (
                <p style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 16 }}>{t.evolucao.registrePeso}</p>
              ) : (
                <>
                  <div className={`meta-track${g.achieved ? " reached" : ""}`} style={{ "--pos": pos } as CSSProperties}>
                    <div className="meta-fill" />
                    <div className="meta-marker" />
                    <span className="meta-cap start">{ptNum(g.startWeightKg, 0)}</span>
                    <span className="meta-cap target">{ptNum(g.targetWeightKg, 0)}</span>
                  </div>
                  {g.achieved ? (
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--gain)" }}>
                      {t.evolucao.metaAtingida}
                      {g.achievedOn && <span style={{ fontWeight: 400 }}> {t.evolucao.em(fmtDate(g.achievedOn, locale))}</span>}
                    </div>
                  ) : gap != null ? (
                    <div className="h-mono" style={{ fontSize: 13, fontVariantNumeric: "tabular-nums", color: "var(--text-dim)" }}>
                      {t.evolucao.faltam(ptNum(gap))}
                    </div>
                  ) : null}
                </>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
