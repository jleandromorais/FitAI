/** Formata volume: 1500 → "1.5k", 850 → "850" */
export function fmtVol(v: number): string {
  return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0);
}
