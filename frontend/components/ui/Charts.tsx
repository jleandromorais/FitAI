"use client";

import { useId } from "react";

interface LineChartProps {
  data: number[];
  height?: number;
  color?: string;
  showDots?: boolean;
  yLabel?: (v: number) => string;
  label?: string;
}

export function LineChart({ data, height = 180, color = 'var(--accent)', showDots, yLabel, label }: LineChartProps) {
  // useId() inclui ":" (ex: ":r0:"), inválido em referências url(#id) — remove.
  // Precisa vir antes de qualquer return condicional (Rules of Hooks).
  const gid = `lcg-${useId().replace(/:/g, "")}`;

  if (data.length < 2) return null; // precisa de ao menos 2 pontos pra traçar uma linha

  const W = 600, H = height, padL = 36, padR = 8, padT = 16, padB = 22;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const stepX = (W - padL - padR) / (data.length - 1);
  const pts = data.map((v, i) => [padL + i * stepX, padT + (1 - (v - min) / range) * (H - padT - padB)] as [number, number]);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  const areaPath = path + ` L${pts[pts.length - 1][0]},${H - padB} L${padL},${H - padB} Z`;
  const fmt = yLabel ?? ((v: number) => v.toString());

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}
      role="img" aria-label={label ?? "Gráfico de evolução"}>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="chart-grid">
        {[0, 1, 2, 3].map(i => {
          const y = padT + (i / 3) * (H - padT - padB);
          const v = max - (i / 3) * range;
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} />
              <text x={padL - 8} y={y + 4} fill="var(--text-mute)" fontSize="10" textAnchor="end"
                fontFamily="var(--font-mono)">
                {fmt(v)}
              </text>
            </g>
          );
        })}
      </g>
      <path d={areaPath} fill={`url(#${gid})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {showDots && pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]}
          r={i === pts.length - 1 ? 4.5 : 0}
          fill={color} stroke="var(--bg)" strokeWidth="2" />
      ))}
    </svg>
  );
}

interface BarChartProps { data: number[]; height?: number; label?: string; }

export function BarChart({ data, height = 180, label }: BarChartProps) {
  const W = 600, H = height, padT = 16, padB = 22, padL = 36, padR = 8;
  const max = Math.max(...data) || 1; // evita 0/0 = NaN quando todos os valores são 0
  const barW = (W - padL - padR) / data.length * 0.55;
  const gap = (W - padL - padR) / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block' }}
      role="img" aria-label={label ?? "Gráfico de barras"}>
      <g className="chart-grid">
        {[0, 1, 2, 3].map(i => {
          const y = padT + (i / 3) * (H - padT - padB);
          return <line key={i} x1={padL} x2={W - padR} y1={y} y2={y} />;
        })}
      </g>
      {data.map((v, i) => {
        const h = (v / max) * (H - padT - padB);
        const x = padL + i * gap + (gap - barW) / 2;
        const isLast = i === data.length - 1;
        return (
          <rect key={i} x={x} y={H - padB - h} width={barW} height={h} rx="3"
            fill={isLast ? 'var(--accent)' : 'var(--surface-3)'} />
        );
      })}
    </svg>
  );
}

interface SparklineProps { data: number[]; width?: number; height?: number; color?: string; label?: string; pulse?: boolean; pulseDelayMs?: number; }

export function Sparkline({ data, width = 100, height = 30, color = 'var(--accent)', label, pulse, pulseDelayMs = 0 }: SparklineProps) {
  if (data.length < 2) return null; // precisa de ao menos 2 pontos pra traçar uma linha

  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const stepX = width / (data.length - 1);
  const toPoint = (v: number, i: number): [number, number] => [i * stepX, (1 - (v - min) / range) * height];
  const path = data.map((v, i) => {
    const [x, y] = toPoint(v, i);
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
  const [lastX, lastY] = toPoint(data[data.length - 1], data.length - 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', maxWidth: width, display: 'block', overflow: 'visible' }}
      role="img" aria-label={label ?? "Mini-gráfico de tendência"}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {pulse && (
        <>
          {/* Halo pulsante no ponto mais recente — sinaliza "dado ao vivo", reaproveita
              o mesmo motivo do dot atual do RepCounter (glow + pulse), não uma animação nova. */}
          <circle cx={lastX} cy={lastY} r="5" fill={color} opacity="0.35" className="pulse"
            style={pulseDelayMs ? { animationDelay: `${pulseDelayMs}ms` } : undefined} />
          <circle cx={lastX} cy={lastY} r="2" fill={color} />
        </>
      )}
    </svg>
  );
}
