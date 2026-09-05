"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { labelStyle } from "@/lib/workout-shared";
import { fmtKg, fmtPct } from "@/lib/format";
import { bmi, bmiBand } from "@/lib/body";
import type { BodyMeasurement, NewMeasurement } from "@/hooks/useBodyMeasurements";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string, locale: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

function parseNum(s: string): number | null {
  const n = Number(s.replace(",", "."));
  return s.trim() === "" || Number.isNaN(n) ? null : n;
}

const bandKey = { abaixo: "imcAbaixo", normal: "imcNormal", sobrepeso: "imcSobrepeso", obesidade: "imcObesidade" } as const;

interface Props {
  measurements: BodyMeasurement[];
  create: (body: NewMeasurement) => Promise<BodyMeasurement>;
  remove: (id: number) => Promise<void>;
  /** Chamado após criar/apagar uma medida — a página recarrega as metas. */
  onChanged: () => void;
}

export default function MedidasTab({ measurements, create, remove, onChanged }: Props) {
  const { t, locale } = useLanguage();

  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [fat, setFat] = useState("");
  const [date, setDate] = useState(todayISO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<number | null>(null);

  const weightNum = parseNum(weight);
  const canSave = weightNum != null && !saving;

  async function handleSave() {
    if (weightNum == null) return;
    setSaving(true);
    setError(null);
    try {
      const created = await create({
        weightKg: weightNum,
        heightCm: parseNum(height),
        bodyFatPct: parseNum(fat),
        measuredAt: date,
      });
      setFreshId(created.id);
      setWeight("");
      setFat("");
      // altura muda pouco entre pesagens — mantém preenchida pra próxima.
      setDate(todayISO());
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.evolucao.erroSalvar);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(m: BodyMeasurement) {
    if (!window.confirm(t.evolucao.apagarMedida)) return;
    await remove(m.id);
    onChanged();
  }

  // Lista já vem mais recente primeiro do backend.
  const latest = measurements[0];
  const latestImc = latest && latest.heightCm != null ? bmi(latest.weightKg, latest.heightCm) : null;

  return (
    <div className="col gap-4">
      {/* Registrar */}
      <div className="card anim-up">
        <div className="h-eyebrow" style={{ marginBottom: 16 }}>{t.evolucao.medidasAtuais}</div>
        <div className="row gap-3" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={labelStyle}>{t.evolucao.peso} (kg)</label>
            <input
              className="input" type="number" inputMode="decimal" min={20} max={500} step={0.1}
              style={{ maxWidth: 120 }} value={weight} onChange={e => setWeight(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>{t.evolucao.altura} (cm) · {t.evolucao.opcional}</label>
            <input
              className="input" type="number" inputMode="decimal" min={50} max={260} step={0.5}
              style={{ maxWidth: 120 }} value={height} onChange={e => setHeight(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>{t.evolucao.gordura} (%) · {t.evolucao.opcional}</label>
            <input
              className="input" type="number" inputMode="decimal" min={1} max={70} step={0.1}
              style={{ maxWidth: 120 }} value={fat} onChange={e => setFat(e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>{t.evolucao.data}</label>
            <input
              className="input" type="date" max={todayISO()}
              style={{ maxWidth: 170 }} value={date} onChange={e => setDate(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-primary" disabled={!canSave} onClick={handleSave}>
            {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Plus size={16} />}
            {t.evolucao.salvarMedida}
          </button>
        </div>
        {error && <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 12 }}>{error}</p>}
        {latestImc != null && (
          <div style={{ marginTop: 14, fontSize: 13, color: "var(--text-dim)" }}>
            {t.evolucao.imc}{" "}
            <span className="h-mono" style={{ color: "var(--text)" }}>
              {latestImc.toFixed(1).replace(".", ",")}
            </span>{" "}
            <span className="dot-sep" /> {t.evolucao[bandKey[bmiBand(latestImc)]]}
          </div>
        )}
      </div>

      {/* Histórico */}
      {measurements.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--text-mute)", fontSize: 13 }}>{t.evolucao.nenhumaMedida}</p>
        </div>
      ) : (
        <div className="card">
          <div className="h-eyebrow" style={{ marginBottom: 8 }}>{t.evolucao.historico}</div>
          <div className="col">
            {measurements.map(m => (
              <div
                key={m.id}
                className={`measure-row row between${m.id === freshId ? " fresh" : ""}`}
                style={{ padding: "10px 8px", borderRadius: "var(--radius-sm)", borderBottom: "1px solid var(--border-soft)" }}
              >
                <div>
                  <div className="h-mono" style={{ fontSize: 14, fontWeight: 600 }}>{fmtKg(m.weightKg)}</div>
                  <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>
                    {fmtDate(m.measuredAt, locale)}
                    {m.heightCm != null && <> <span className="dot-sep" /> {m.heightCm.toString().replace(".", ",")} cm</>}
                    {m.bodyFatPct != null && <> <span className="dot-sep" /> {fmtPct(m.bodyFatPct)}</>}
                  </div>
                  {m.note && <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{m.note}</div>}
                </div>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t.evolucao.apagarMedida}
                  onClick={() => handleDelete(m)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
