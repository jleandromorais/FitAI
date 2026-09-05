"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Camera } from "lucide-react";
import { LineChart } from "@/components/ui/Charts";
import { useCountUp } from "@/hooks/useCountUp";
import { useLanguage } from "@/contexts/LanguageContext";
import type { BodyMeasurement } from "@/hooks/useBodyMeasurements";
import type { WeightGoal } from "@/hooks/useWeightGoals";
import { bmi, bmiBand } from "@/lib/body";

// "boot" da contagem animada só na 1ª visita da sessão — mesmo padrão do
// dashboard (fitai:dashboard-intro-seen).
const SEEN_KEY = "fitai:evolucao-intro-seen";

function ptNum(n: number, digits = 1): string {
  return n.toFixed(digits).replace(".", ",");
}

const bandLabelKey: Record<ReturnType<typeof bmiBand>, "imcAbaixo" | "imcNormal" | "imcSobrepeso" | "imcObesidade"> = {
  abaixo: "imcAbaixo",
  normal: "imcNormal",
  sobrepeso: "imcSobrepeso",
  obesidade: "imcObesidade",
};

interface Props {
  measurements: BodyMeasurement[];
  goals: WeightGoal[];
  onGoToFotos: () => void;
}

export default function EvolucaoResumo({ measurements, goals, onGoToFotos }: Props) {
  const { t } = useLanguage();

  const [seen] = useState(() => {
    try { return sessionStorage.getItem(SEEN_KEY) === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* private mode */ }
  }, []);

  // Ordem cronológica ascendente pro gráfico e pro delta.
  const asc = [...measurements].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const enough = asc.length >= 2;
  const first = asc[0];
  const latest = asc[asc.length - 1];
  const delta = enough ? latest.weightKg - first.weightKg : 0;

  const currentWeight = latest?.weightKg ?? 0;
  const count = useCountUp(currentWeight, { skip: seen || !latest });

  // Meta destacada: a 1ª ainda não atingida; se todas atingidas, a mais recente.
  const activeGoal: WeightGoal | undefined = goals.find(g => !g.achieved) ?? goals[0];

  if (!enough) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <div className="h-eyebrow" style={{ marginBottom: 10 }}>{t.evolucao.evolucaoPeso}</div>
        <p style={{ color: "var(--text-mute)", fontSize: 13 }}>{t.evolucao.registreDuasMedidas}</p>
      </div>
    );
  }

  const imc = latest.heightCm != null ? bmi(latest.weightKg, latest.heightCm) : null;

  return (
    <div className="col gap-4">
      {/* Tendência de peso */}
      <div className="card anim-up">
        <div className="row between" style={{ alignItems: "flex-start", marginBottom: 12 }}>
          <div className="h-eyebrow">{t.evolucao.evolucaoPeso}</div>
          <span
            className="chip"
            style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", cursor: "default" }}
          >
            {delta > 0 ? <ArrowUpRight size={13} /> : delta < 0 ? <ArrowDownRight size={13} /> : null}
            {delta > 0 ? "+" : ""}{ptNum(delta)} kg
            <span style={{ color: "var(--text-mute)", fontWeight: 500, marginLeft: 6, fontFamily: "var(--font-body)" }}>
              {t.evolucao.vsPrimeira}
            </span>
          </span>
        </div>
        <LineChart
          data={asc.map(m => m.weightKg)}
          height={200}
          showDots
          yLabel={v => `${v.toFixed(0)}`}
          label={t.evolucao.evolucaoPeso}
        />
      </div>

      {/* Tiles */}
      <div className="grid-cols-3" style={{ gap: 16 }}>
        <div className="card card-tight anim-up" style={{ animationDelay: "60ms" }}>
          <div className="stat-label">{t.evolucao.pesoAtual}</div>
          <div style={{ marginTop: 8 }}>
            <span
              className="stat-num"
              style={{
                fontSize: 26,
                fontFamily: count.done ? undefined : "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {ptNum(count.value)}
            </span>
            <span className="stat-unit">kg</span>
          </div>
        </div>

        <div className="card card-tight anim-up" style={{ animationDelay: "120ms" }}>
          <div className="stat-label">{t.evolucao.imc}</div>
          <div style={{ marginTop: 8 }}>
            {imc != null ? (
              <>
                <span className="stat-num" style={{ fontSize: 26, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                  {ptNum(imc)}
                </span>
                <span className="stat-unit">{t.evolucao[bandLabelKey[bmiBand(imc)]]}</span>
              </>
            ) : (
              <span style={{ color: "var(--text-mute)", fontSize: 16 }}>—</span>
            )}
          </div>
        </div>

        <div className="card card-tight anim-up" style={{ animationDelay: "180ms" }}>
          <div className="stat-label">{activeGoal ? t.evolucao.metaPeso : t.evolucao.metaAtiva}</div>
          <div style={{ marginTop: 8 }}>
            {!activeGoal ? (
              <span style={{ color: "var(--text-mute)", fontSize: 16 }}>{t.evolucao.semMetaAtiva}</span>
            ) : activeGoal.achieved ? (
              <span className="h-display" style={{ fontSize: 16, color: "var(--gain)" }}>{t.evolucao.metaAtingida}</span>
            ) : activeGoal.currentWeightKg != null ? (
              <>
                <span className="stat-num" style={{ fontSize: 26, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                  {ptNum(Math.abs(activeGoal.currentWeightKg - activeGoal.targetWeightKg))}
                </span>
                <span className="stat-unit">kg</span>
              </>
            ) : (
              <span className="h-mono" style={{ fontSize: 16 }}>{ptNum(activeGoal.targetWeightKg)} kg</span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="btn btn-secondary"
        onClick={onGoToFotos}
        style={{ alignSelf: "flex-start" }}
      >
        <Camera size={15} /> {t.evolucao.verFotos}
      </button>
    </div>
  );
}
