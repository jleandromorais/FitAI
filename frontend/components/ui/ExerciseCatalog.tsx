"use client";

import { useRef, useState } from "react";
import { Search, Info, Plus, Check, Dumbbell } from "lucide-react";
import { EXERCISE_CATALOG, ExerciseSuggestion } from "@/lib/exercises";
import { ExerciseRow, chipToggleStyle, labelStyle } from "@/lib/workout-shared";

interface Props {
  exercises: ExerciseRow[];
  availableGroups: string[];       // grupos pré-filtrados para o contexto (slot ou treino)
  onAdd: (sug: ExerciseSuggestion) => void;
  onAddCustom: (name: string, group: string) => void;
  children?: React.ReactNode;      // exercícios já adicionados (renderizados pelo pai)
}

const ALL_GROUPS_OPTION = "__all__";

export default function ExerciseCatalog({ exercises, availableGroups, onAdd, onAddCustom, children }: Props) {
  const [query, setQuery]           = useState("");
  const [activeGroup, setActiveGroup] = useState<string>(availableGroups[0] ?? ALL_GROUPS_OPTION);
  const [tipFor, setTipFor]         = useState<string | null>(null);
  const searchRef                   = useRef<HTMLInputElement>(null);

  const alreadyAdded = new Set(exercises.map(e => e.name));

  const suggestions: ExerciseSuggestion[] = EXERCISE_CATALOG.filter(ex => {
    const matchGroup = activeGroup === ALL_GROUPS_OPTION || ex.group === activeGroup;
    const matchQuery = query.length < 2 || ex.name.toLowerCase().includes(query.toLowerCase());
    return matchGroup && matchQuery;
  });

  const showCustomOption =
    query.trim().length >= 2 &&
    !suggestions.some(s => s.name.toLowerCase() === query.trim().toLowerCase());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Busca */}
      <div style={{ position: "relative" }}>
        <Search size={14} style={{
          position: "absolute", left: 12, top: "50%",
          transform: "translateY(-50%)", color: "var(--text-mute)", pointerEvents: "none",
        }} />
        <input
          ref={searchRef}
          className="input"
          placeholder="Buscar exercício..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ paddingLeft: 36 }}
        />
      </div>

      {/* Filtro por grupo */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {availableGroups.map(g => (
          <button key={g} onClick={() => setActiveGroup(g)} style={chipToggleStyle(activeGroup === g)}>
            {g}
          </button>
        ))}
        <button onClick={() => setActiveGroup(ALL_GROUPS_OPTION)} style={chipToggleStyle(activeGroup === ALL_GROUPS_OPTION)}>
          Todos
        </button>
      </div>

      {/* Lista de sugestões */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={labelStyle}>
          {query.length >= 2
            ? `Resultados para "${query}"`
            : `Sugestões — ${activeGroup === ALL_GROUPS_OPTION ? "Todos" : activeGroup}`}
        </div>

        {suggestions.map(sug => {
          const added = alreadyAdded.has(sug.name);
          return (
            <div key={sug.name} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderRadius: 10,
              background: added ? "var(--accent-soft)" : "var(--surface-2)",
              border: `1.5px solid ${added ? "var(--accent)" : "var(--border-soft)"}`,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: added ? "var(--accent)" : "var(--text)" }}>
                  {sug.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>
                  {sug.muscle} · {sug.defaultSets}×{sug.defaultReps}
                  {sug.defaultWeight > 0 ? ` · ${sug.defaultWeight}kg` : " · Peso corporal"}
                </div>
              </div>
              <button
                onClick={() => setTipFor(tipFor === sug.name ? null : sug.name)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-mute)", padding: 4 }}
              >
                <Info size={14} />
              </button>
              <button
                onClick={() => !added && onAdd(sug)}
                disabled={added}
                style={{
                  padding: "4px 12px", borderRadius: 7, fontSize: 12, fontWeight: 700,
                  background: added ? "var(--accent)" : "var(--surface)",
                  color: added ? "#000" : "var(--accent)",
                  border: "1.5px solid var(--accent)",
                  cursor: added ? "default" : "pointer",
                  display: "flex", alignItems: "center", gap: 4,
                }}
              >
                {added ? <><Check size={12} /> Adicionado</> : <><Plus size={12} /> Adicionar</>}
              </button>
            </div>
          );
        })}

        {/* Dica inline */}
        {tipFor && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, fontSize: 12, lineHeight: 1.55,
            background: "var(--accent-soft)", border: "1.5px solid var(--accent)", color: "var(--accent)",
          }}>
            <strong>Dica:</strong> {EXERCISE_CATALOG.find(e => e.name === tipFor)?.tips}
          </div>
        )}

        {/* Adicionar exercício personalizado */}
        {showCustomOption && (
          <button
            className="btn btn-secondary"
            onClick={() => { onAddCustom(query.trim(), activeGroup === ALL_GROUPS_OPTION ? "" : activeGroup); setQuery(""); }}
            style={{ marginTop: 4 }}
          >
            <Plus size={14} /> Adicionar &ldquo;{query.trim()}&rdquo; como personalizado
          </button>
        )}
      </div>

      {/* Exercícios já adicionados (renderizados pelo pai via children) */}
      {exercises.length > 0 && children && (
        <div>
          <div style={{ ...labelStyle, marginTop: 8 }}>
            No treino ({exercises.length})
          </div>
          {children}
        </div>
      )}

      {exercises.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-mute)" }}>
          <Dumbbell size={32} style={{ marginBottom: 10, opacity: 0.4 }} />
          <div style={{ fontSize: 13 }}>Adicione exercícios acima.</div>
        </div>
      )}
    </div>
  );
}
