"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Sparkles, Plus, Play, Edit2, Trash2, Loader2, Search, X, Dumbbell } from "lucide-react";
import { useWorkouts, Workout } from "@/hooks/useWorkouts";
import { useLanguage } from "@/contexts/LanguageContext";
import NovoTreinoModal from "@/components/NovoTreinoModal";
import EditarTreinoModal from "@/components/EditarTreinoModal";

// Chaves canônicas em português (batem com w.tags, dado real) — o rótulo
// exibido vem de t.filtros[chave].
const FILTERS = ["Todos", "Força", "Hipertrofia", "Volume", "Acessório"] as const;

export default function TreinosPage() {
  const { t } = useLanguage();
  const { workouts, loading, error, reload, deleteWorkout } = useWorkouts();
  const [filter, setFilter]       = useState<typeof FILTERS[number]>("Todos");
  const [query, setQuery]         = useState("");
  const [showNovo, setShowNovo]   = useState(false);
  const [editando, setEditando]   = useState<Workout | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Workout | null>(null);
  const [deleting, setDeleting]   = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workouts.filter(w => {
      const matchFilter = filter === "Todos" || w.tags.includes(filter);
      const matchQuery  = !q ||
        w.name.toLowerCase().includes(q) ||
        w.exercises.some(e => e.name.toLowerCase().includes(q)) ||
        w.tags.some(t => t.toLowerCase().includes(q));
      return matchFilter && matchQuery;
    });
  }, [workouts, filter, query]);

  async function handleDelete(w: Workout) {
    setDeleting(true);
    try {
      await deleteWorkout(w.id);
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }

  return (
    <div className="anim-up">
      <div className="page-head">
        <div>
          <h1 className="page-title">{t.treinos.titulo}</h1>
          <div className="page-sub">
            {loading ? t.treinos.carregando : t.treinos.contagem(workouts.length)}
          </div>
        </div>
        <div className="page-actions">
          <Link href="/ai-gen" className="btn btn-secondary">
            <Sparkles size={16} /> {t.treinos.gerarComIA}
          </Link>
          <button className="btn btn-primary" onClick={() => setShowNovo(true)}>
            <Plus size={16} /> {t.treinos.novoTreino}
          </button>
        </div>
      </div>

      {/* Busca + Filtros */}
      <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ position: "relative" }}>
          <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-mute)", pointerEvents: "none" }} />
          <input
            className="input"
            placeholder={t.treinos.buscarPlaceholder}
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ paddingLeft: 38, paddingRight: query ? 36 : 12 }}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-mute)", display: "flex" }}>
              <X size={14} />
            </button>
          )}
        </div>
        <div className="row gap-2" style={{ flexWrap: "wrap" }}>
          {FILTERS.map(f => (
            <button key={f} className={`chip${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>{t.filtros[f]}</button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Loader2 size={32} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "var(--danger)" }}>{error}</p>
        </div>
      )}

      {/* Estado vazio */}
      {!loading && !error && workouts.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div className="auth-status-icon" style={{ margin: "0 auto 16px" }}><Dumbbell size={26} /></div>
          <div className="h-display" style={{ fontSize: 20, marginBottom: 8 }}>{t.treinos.nenhumTreinoAinda}</div>
          <p style={{ color: "var(--text-dim)", marginBottom: 24 }}>{t.treinos.crieSeuPrimeiro}</p>
          <Link href="/ai-gen" className="btn btn-primary">
            <Sparkles size={16} /> {t.treinos.gerarComIA}
          </Link>
        </div>
      )}

      {/* Sem resultados de busca */}
      {!loading && !error && workouts.length > 0 && filtered.length === 0 && (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <Search size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{t.treinos.nenhumEncontrado}</div>
          <p style={{ color: "var(--text-mute)", fontSize: 13, marginBottom: 16 }}>
            {t.treinos.nenhumCorresponde(query)}
          </p>
          <button className="btn btn-ghost btn-sm" onClick={() => { setQuery(""); setFilter("Todos"); }}>
            {t.treinos.limparFiltros}
          </button>
        </div>
      )}

      {/* Grid de treinos */}
      {!loading && filtered.length > 0 && (
        <div className="grid-cols-2" style={{ gap: 20 }}>
          {filtered.map(w => (
            <div key={w.id} className="card" style={{ padding: 24 }}>

              {/* Cabeçalho do card: código, nome, botões de ação */}
              <div className="row between" style={{ marginBottom: 20 }}>
                <div className="row gap-3">
                  <div style={{
                    width: 52, height: 52, borderRadius: 13,
                    background: "var(--accent-soft)", border: "1px solid rgba(255,109,41,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--accent)", fontSize: 22,
                  }}>{w.code}</div>
                  <div>
                    <div className="h-display" style={{ fontSize: 20 }}>{w.name}</div>
                    <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>{w.schedule}</div>
                  </div>
                </div>

                {/* Botões editar e excluir */}
                <div className="row gap-2">
                  <button
                    className="icon-btn"
                    style={{ width: 32, height: 32 }}
                    title={t.treinos.editarTreino}
                    onClick={() => setEditando(w)}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="icon-btn"
                    style={{ width: 32, height: 32, color: "var(--danger)" }}
                    title={t.treinos.excluirTreino}
                    onClick={() => setConfirmDelete(w)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="row gap-2" style={{ marginBottom: 20, flexWrap: "wrap" }}>
                {w.tags.map(t => <span key={t} className="chip chip-accent">{t}</span>)}
              </div>

              {/* Stats do treino */}
              <div className="grid-cols-4" style={{
                gap: 12,
                marginBottom: 20, padding: "14px 0",
                borderTop: "1px solid var(--border-soft)", borderBottom: "1px solid var(--border-soft)",
              }}>
                {[
                  [w.duration, t.treinos.min],
                  [w.exercises.length, t.treinos.exercicios],
                  [w.totalSets, t.treinos.series],
                  [`${(w.volume / 1000).toFixed(1)}k`, t.treinos.kgVol],
                ].map(([v, l], i) => (
                  <div key={i}>
                    <div className="h-mono" style={{ fontSize: 17, fontWeight: 700 }}>{v}</div>
                    <div style={{ fontSize: 11, color: "var(--text-mute)", marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>

              <div className="row between">
                <div style={{ fontSize: 12, color: "var(--text-mute)" }}>
                  {w.lastDone ? t.treinos.ultimoHa(w.lastDone) : t.treinos.nuncaRealizado}
                </div>
                <Link href={`/treinos/${w.id}`} className="btn btn-primary btn-sm">
                  <Play size={12} fill="currentColor" /> {t.treinos.iniciar}
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Modal de criação de novo treino */}
      {showNovo && (
        <NovoTreinoModal
          onClose={() => setShowNovo(false)}
          onCreated={reload}
        />
      )}

      {/* Modal de edição de treino existente */}
      {editando && (
        <EditarTreinoModal
          workout={editando}
          onClose={() => setEditando(null)}
          onSaved={reload}
        />
      )}

      {/* Dialog de confirmação de exclusão */}
      {confirmDelete && (
        <>
          <div onClick={() => setConfirmDelete(null)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)", zIndex: 1000,
          }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(400px, 90vw)", background: "var(--bg)",
            border: "1.5px solid var(--border)", borderRadius: 16,
            boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
            padding: 28, zIndex: 1001,
          }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              {t.treinos.excluirTreinoPergunta}
            </div>
            <p style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 24, lineHeight: 1.55 }}>
              <strong style={{ color: "var(--text)" }}>{confirmDelete.name}</strong> {t.treinos.removidoPermanente}{" "}
              {t.treinos.acaoNaoPodeDesfeita}
            </p>
            <div className="row gap-3" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>
                {t.treinos.cancelar}
              </button>
              <button
                className="btn btn-danger"
                disabled={deleting}
                onClick={() => handleDelete(confirmDelete)}
              >
                {deleting ? t.treinos.excluindo : t.treinos.simExcluir}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
