interface HudCornersProps {
  color?: string;
  size?: number;
  inset?: number;
}

const BRACKET_PATH = "M1 5V1H5";

const POSITIONS = [
  { top: true, left: true, rotate: 0 },
  { top: true, left: false, rotate: 90 },
  { top: false, left: false, rotate: 180 },
  { top: false, left: true, rotate: 270 },
] as const;

// Molduras de canto estilo HUD — motivo decorativo reutilizável que reforça a
// leitura "painel de sistema" num card, sem introduzir nenhuma cor nova (usa
// --accent por defeito, a mesma que o resto do sistema já possui).
export function HudCorners({ color = "var(--accent)", size = 14, inset = 10 }: HudCornersProps) {
  return (
    <>
      {POSITIONS.map((p, i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
          style={{
            position: "absolute",
            top: p.top ? inset : undefined,
            bottom: p.top ? undefined : inset,
            left: p.left ? inset : undefined,
            right: p.left ? undefined : inset,
            transform: `rotate(${p.rotate}deg)`,
            opacity: 0.55,
            pointerEvents: "none",
          }}
        >
          <path d={BRACKET_PATH} stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ))}
    </>
  );
}
