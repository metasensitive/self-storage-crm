interface AreaChartPoint {
  date: string;
  value: number;
}

interface AreaChartProps {
  data: AreaChartPoint[];
  height?: number;
  color?: string;
}

export function AreaChart({ data, height = 220, color = 'var(--ink)' }: AreaChartProps) {
  if (data.length === 0) return null;

  const w = 800;
  const h = height;
  const pad = { l: 40, r: 12, t: 12, b: 26 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const max = Math.max(...data.map((d) => d.value)) * 1.1 || 1;
  const min = 0;

  const xs = (i: number) => pad.l + (i / Math.max(data.length - 1, 1)) * innerW;
  const ys = (v: number) => pad.t + innerH - ((v - min) / (max - min)) * innerH;

  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${ys(d.value)}`).join(' ');
  const area = `${path} L ${xs(data.length - 1)} ${pad.t + innerH} L ${pad.l} ${pad.t + innerH} Z`;

  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => (max / ticks) * i);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="area-chart"
      aria-hidden="true"
    >
      {tickVals.map((v, i) => (
        <g key={i}>
          <line
            x1={pad.l}
            x2={w - pad.r}
            y1={ys(v)}
            y2={ys(v)}
            stroke="var(--line)"
            strokeDasharray={i === 0 ? '0' : '2 4'}
          />
          <text
            x={pad.l - 8}
            y={ys(v) + 4}
            fontSize="10"
            fill="var(--ink-3)"
            textAnchor="end"
            fontFamily="var(--mono)"
          >
            {Math.round(v / 1000)}k
          </text>
        </g>
      ))}
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#area-fill)" />
      <path d={path} stroke={color} strokeWidth="1.6" fill="none" />
      {data.map((d, i) => {
        if (i % 5 !== 0 && i !== data.length - 1) return null;
        const date = new Date(d.date);
        return (
          <text
            key={i}
            x={xs(i)}
            y={h - 8}
            fontSize="10"
            fill="var(--ink-3)"
            textAnchor="middle"
            fontFamily="var(--mono)"
          >
            {date.getDate()}.{String(date.getMonth() + 1).padStart(2, '0')}
          </text>
        );
      })}
    </svg>
  );
}
