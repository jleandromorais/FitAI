"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useBodyPhotos, type BodyPhoto } from "@/hooks/useBodyPhotos";
import { ALL_GROUPS } from "@/lib/exercises";
import { chipToggleStyle, labelStyle } from "@/lib/workout-shared";
import { useLanguage } from "@/contexts/LanguageContext";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso: string, locale: string): string {
  // new Date("yyyy-MM-dd") interpretaria como UTC meia-noite — troca pra
  // meio-dia local antes de formatar, pra nunca mostrar o dia anterior
  // por causa de fuso horário negativo.
  return new Date(iso + "T12:00:00").toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

export default function FotosTab() {
  const { t, locale } = useLanguage();
  const { photos, loading, error, upload, remove } = useBodyPhotos();

  const [muscleGroup, setMuscleGroup] = useState<string>(ALL_GROUPS[0]);
  const [capturedAt, setCapturedAt] = useState(todayISO);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      await upload(file, muscleGroup, capturedAt);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : t.fotosTab.erroEnviar);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photo: BodyPhoto) {
    if (!window.confirm(t.fotosTab.confirmarExclusao)) return;
    await remove(photo.id);
  }

  if (loading) {
    return (
      <div role="status" aria-live="polite" style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Loader2 size={28} color="var(--accent)" style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: "center", padding: 48 }}>
        <p style={{ color: "var(--text-dim)", fontSize: 13 }}>{t.fotosTab.erroCarregar}</p>
      </div>
    );
  }

  // Agrupa por grupo muscular, preservando a ordem cronológica decrescente
  // que já vem do backend (findAllByUserEmailOrderByCapturedAtDesc).
  const grouped = new Map<string, BodyPhoto[]>();
  for (const photo of photos) {
    const list = grouped.get(photo.muscleGroup) ?? [];
    list.push(photo);
    grouped.set(photo.muscleGroup, list);
  }

  return (
    <div className="col gap-4">
      {/* Envio de nova foto */}
      <div className="card">
        <div className="h-eyebrow" style={{ marginBottom: 16 }}>{t.fotosTab.novaFoto}</div>
        <div className="row gap-3" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label style={labelStyle}>{t.fotosTab.grupoMuscular}</label>
            <div className="row gap-2" style={{ flexWrap: "wrap" }}>
              {ALL_GROUPS.map(g => (
                <button key={g} type="button" onClick={() => setMuscleGroup(g)} style={chipToggleStyle(muscleGroup === g)}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="row gap-3" style={{ flexWrap: "wrap", alignItems: "flex-end", marginTop: 16 }}>
          <div>
            <label style={labelStyle}>{t.fotosTab.data}</label>
            <input
              type="date"
              className="input"
              value={capturedAt}
              max={todayISO()}
              onChange={e => setCapturedAt(e.target.value)}
            />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={labelStyle}>{t.fotosTab.foto}</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="input"
              style={{ padding: "8px 14px" }}
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!file || uploading}
            onClick={handleUpload}
          >
            {uploading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <ImagePlus size={16} />}
            {t.fotosTab.enviar}
          </button>
        </div>
        {uploadError && (
          <p style={{ color: "var(--danger)", fontSize: 12, marginTop: 12 }}>{uploadError}</p>
        )}
      </div>

      {/* Timeline por grupo muscular */}
      {grouped.size === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <Camera size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p style={{ color: "var(--text-mute)", fontSize: 13 }}>{t.fotosTab.nenhumaFoto}</p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([group, groupPhotos]) => (
          <div key={group} className="card">
            <div className="h-eyebrow" style={{ marginBottom: 16 }}>{group}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
              {groupPhotos.map(photo => (
                <div key={photo.id} className="col photo-card" style={{ gap: 6 }}>
                  <div style={{ position: "relative", borderRadius: "var(--radius-sm)", overflow: "hidden", aspectRatio: "3/4", background: "var(--surface-2)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- passa pela rota de proxy autenticada (blob é privado), fora dos domínios que next/image otimiza sem configuração extra */}
                    <img src={`/api/body-photos/image?url=${encodeURIComponent(photo.photoUrl)}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button
                      type="button"
                      onClick={() => handleDelete(photo)}
                      aria-label={t.fotosTab.apagar}
                      style={{
                        position: "absolute", top: 6, right: 6,
                        width: 28, height: 28, borderRadius: "50%",
                        background: "rgba(22,19,22,0.7)", border: "none",
                        color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-mute)" }}>{fmtDate(photo.capturedAt, locale)}</span>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
