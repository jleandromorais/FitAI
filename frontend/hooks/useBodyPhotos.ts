"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface BodyPhoto {
  id: number;
  muscleGroup: string;
  photoUrl: string;
  capturedAt: string; // ISO (yyyy-MM-dd) — LocalDate do backend
}

export function useBodyPhotos() {
  const [photos, setPhotos] = useState<BodyPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function fetchPhotos() {
    return api.get<BodyPhoto[]>("/body-photos")
      .then(data => { setPhotos(data); setError(null); })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Erro ao carregar fotos."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchPhotos();
  }, []);

  // Upload em si (envio do arquivo + gravação do blob) acontece na rota de
  // API do Next (/api/body-photos) — este hook só chama essa rota e depois
  // sincroniza o estado local com o que ela devolve, mesmo padrão de
  // createWorkout() em useWorkouts.ts.
  async function upload(file: File, muscleGroup: string, capturedAt: string): Promise<BodyPhoto> {
    const token = localStorage.getItem("token");
    const form = new FormData();
    form.append("file", file);
    form.append("muscleGroup", muscleGroup);
    form.append("capturedAt", capturedAt);

    const res = await fetch("/api/body-photos", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error ?? "Erro ao enviar foto.");
    }
    const created: BodyPhoto = await res.json();
    setPhotos(prev => [created, ...prev]);
    return created;
  }

  async function remove(id: number) {
    await api.delete(`/body-photos/${id}`);
    setPhotos(prev => prev.filter(p => p.id !== id));
  }

  return { photos, loading, error, upload, remove, reload: fetchPhotos };
}
