// IMC é SEMPRE derivado no cliente na hora de renderizar — nunca persistido
// (Regra da Honestidade do Painel). Exibido só quando há altura.

/** IMC = peso(kg) / altura(m)². */
export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export type BmiBand = "abaixo" | "normal" | "sobrepeso" | "obesidade";

/** Faixa textual da OMS. Sem cor semântica — não é conquista nem alerta. */
export function bmiBand(value: number): BmiBand {
  if (value < 18.5) return "abaixo";
  if (value < 25) return "normal";
  if (value < 30) return "sobrepeso";
  return "obesidade";
}
