/** Formata volume: 1500 → "1.5k", 850 → "850" */
export function fmtVol(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);
}

/** Peso em pt-BR com 1 casa e vírgula decimal: 82.4 → "82,4 kg" */
export function fmtKg(n: number): string {
  return `${n.toFixed(1).replace(".", ",")} kg`;
}

/** Percentual em pt-BR com 1 casa: 18.5 → "18,5 %" */
export function fmtPct(n: number): string {
  return `${n.toFixed(1).replace(".", ",")} %`;
}
