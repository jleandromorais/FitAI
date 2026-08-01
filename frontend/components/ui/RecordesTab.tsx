"use client";

import Link from "next/link";
import { Trophy, Dumbbell } from "lucide-react";
import { ExerciseProgress } from "@/hooks/useProgress";

interface RecordesTabProps {
  prs: ExerciseProgress[];
}

export default function RecordesTab({ prs }: RecordesTabProps) {
  if (prs.length === 0) {
    return (
      <div className="col-stack">
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div className="auth-status-icon" style={{ margin: "0 auto 16px" }}><Trophy size={26} /></div>
          <div className="h-display" style={{ fontSize: 20, marginBottom: 8 }}>
            Sem recordes ainda
          </div>
          <p style={{ color: "var(--text-dim)", marginBottom: 28 }}>
            Execute treinos com mais carga do que na sessão anterior para criar um recorde.
          </p>
          <Link href="/treinos" className="btn btn-primary">
            <Dumbbell size={16} /> Treinar agora
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="col-stack">
      {prs.map((pr, i) => (
        <div key={pr.name} className="card" style={{ padding: 20 }}>
          <div className="row between">
            <div className="row gap-3">
              {/* Posição do recorde */}
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: i === 0 ? "var(--accent)" : "var(--accent-soft)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}>
                {i === 0
                  ? <Trophy size={22} color="#000" />
                  : <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--accent)", fontSize: 16 }}>
                      {i + 1}
                    </span>
                }
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{pr.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-mute)", marginTop: 2 }}>
                  {pr.muscle}
                </div>
              </div>
            </div>
            <div className="row gap-4" style={{ alignItems: "center" }}>
              <div>
                <div className="h-mono" style={{ fontSize: 20, fontWeight: 700 }}>
                  {pr.currentWeight}
                  <span className="stat-unit">kg</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>
                  anterior: {pr.prevWeight > 0 ? `${pr.prevWeight}kg` : "—"}
                </div>
              </div>
              <span className="chip" style={{
                background: "var(--accent-soft)", color: "var(--accent)",
                border: "1px solid var(--accent)", fontWeight: 700,
              }}>
                +{pr.delta}kg
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
