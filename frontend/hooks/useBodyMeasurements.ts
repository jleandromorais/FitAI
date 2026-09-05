"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export interface BodyMeasurement {
  id: number;
  measuredAt: string;        // ISO (yyyy-MM-dd) — LocalDate do backend
  weightKg: number;
  heightCm: number | null;
  bodyFatPct: number | null;
  note: string | null;
}

export interface NewMeasurement {
  weightKg: number;
  heightCm?: number | null;
  bodyFatPct?: number | null;
  measuredAt: string;
  note?: string | null;
}

// Trio data/loading/error + reload, mesmo contrato de useBodyPhotos/useProgress.
// `error` é limpo no início de cada fetch (padrão de Hooks.md).
export function useBodyMeasurements() {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Não limpa `error` aqui de propósito. Esta função é chamada de dois sítios:
  // do efeito de montagem e do reload() — e o reload() já faz setError(null)
  // ele próprio, logo antes de chamar. No mount não há nada para limpar, o
  // `error` nasce null. Um setState síncrono no corpo desta função tornaria o
  // efeito de montagem um setState-dentro-de-efeito (react-hooks/
  // set-state-in-effect), que é o erro que mantinha o CI vermelho.
  function fetchMeasurements() {
    return api.get<BodyMeasurement[]>("/body-measurements")
      .then(data => setMeasurements(data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchMeasurements();
  }, []);

  async function reload() {
    setLoading(true);
    setError(null);
    await fetchMeasurements();
  }

  // Deixa o erro subir pro componente (o form mostra a própria mensagem);
  // sincroniza o estado local com o que o backend devolveu.
  async function create(body: NewMeasurement): Promise<BodyMeasurement> {
    const created = await api.post<BodyMeasurement>("/body-measurements", body);
    setMeasurements(prev =>
      [created, ...prev].sort((a, b) => b.measuredAt.localeCompare(a.measuredAt)),
    );
    return created;
  }

  async function remove(id: number) {
    await api.delete(`/body-measurements/${id}`);
    setMeasurements(prev => prev.filter(m => m.id !== id));
  }

  return { measurements, loading, error, create, remove, reload };
}
