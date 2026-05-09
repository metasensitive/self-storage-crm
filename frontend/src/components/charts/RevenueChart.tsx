import { useId, useMemo, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { fmtMoney } from '@/lib/format';

export interface RevenuePoint {
  date: string; // YYYY-MM-DD
  value: number;
}

interface RevenueChartProps {
  data: RevenuePoint[];
  height?: number;
  accent?: string;
}

function niceMax(raw: number): number {
  if (raw <= 0) return 1000;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  let nice;
  if (n <= 1) nice = 1;
  else if (n <= 2) nice = 2;
  else if (n <= 5) nice = 5;
  else nice = 10;
  return nice * pow;
}

function fmtAxis(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000) return Math.round(v / 1000) + 'k';
  return String(Math.round(v));
}

function smoothPath(pts: Array<[number, number]>): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0][0]} ${pts[0][1]}`;
  const d: string[] = [`M ${pts[0][0]} ${pts[0][1]}`];
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const cpx = (x0 + x1) / 2;
    d.push(`C ${cpx} ${y0}, ${cpx} ${y1}, ${x1} ${y1}`);
  }
  return d.join(' ');
}

export function RevenueChart({ data, height = 260, accent = 'var(--ink)' }: RevenueChartProps) {
  const W = 1000;
  const H = height;
  const pad = { l: 48, r: 16, t: 16, b: 28 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;

  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const gradientId = useId();

  const max = useMemo(() => {
    const raw = Math.max(0, ...data.map((d) => d.value));
    return niceMax(raw * 1.1 || 1);
  }, [data]);

  const xs = (i: number) =>
    pad.l + (i / Math.max(data.length - 1, 1)) * innerW;
  const ys = (v: number) => pad.t + innerH - (v / max) * innerH;

  const pts: Array<[number, number]> = useMemo(
    () => data.map((d, i) => [xs(i), ys(d.value)] as [number, number]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, max, innerW, innerH],
  );

  const linePath = useMemo(() => smoothPath(pts), [pts]);
  const areaPath = useMemo(() => {
    if (pts.length === 0) return '';
    const last = pts[pts.length - 1];
    const first = pts[0];
    return `${linePath} L ${last[0]} ${pad.t + innerH} L ${first[0]} ${pad.t + innerH} Z`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linePath, pts]);

  const ticks = 4;
  const tickVals = useMemo(
    () => Array.from({ length: ticks + 1 }, (_, i) => (max / ticks) * i),
    [max],
  );

  const xLabelStep = useMemo(() => {
    const wantLabels = 6;
    return Math.max(1, Math.round(data.length / wantLabels));
  }, [data.length]);

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current || data.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;
    const xSvg = xRatio * W;
    if (xSvg < pad.l || xSvg > W - pad.r) {
      setHoverIdx(null);
      return;
    }
    const t = (xSvg - pad.l) / innerW;
    const idx = Math.round(t * (data.length - 1));
    setHoverIdx(Math.max(0, Math.min(data.length - 1, idx)));
  }

  function onLeave() {
    setHoverIdx(null);
  }

  const hoverPoint = hoverIdx != null ? pts[hoverIdx] : null;
  const hoverData = hoverIdx != null ? data[hoverIdx] : null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ width: '100%', height: H, display: 'block', cursor: 'crosshair' }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.20" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Y-axis grid + ticks */}
        {tickVals.map((v, i) => (
          <g key={i}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={ys(v)}
              y2={ys(v)}
              stroke="var(--line)"
              strokeDasharray={i === 0 ? '0' : '2 4'}
            />
            <text
              x={pad.l - 10}
              y={ys(v) + 4}
              fontSize="11"
              fill="var(--ink-3)"
              textAnchor="end"
              fontFamily="var(--mono)"
            >
              {fmtAxis(v)}
            </text>
          </g>
        ))}

        {/* Area + line */}
        {pts.length > 0 && (
          <>
            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path
              d={linePath}
              fill="none"
              stroke={accent}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* X-axis labels */}
        {data.map((d, i) => {
          if (i % xLabelStep !== 0 && i !== data.length - 1) return null;
          const day = dayjs(d.date);
          return (
            <text
              key={i}
              x={xs(i)}
              y={H - 8}
              fontSize="11"
              fill="var(--ink-3)"
              textAnchor="middle"
              fontFamily="var(--mono)"
            >
              {day.format('DD.MM')}
            </text>
          );
        })}

        {/* Hover marker */}
        {hoverPoint && hoverData && (
          <>
            <line
              x1={hoverPoint[0]}
              x2={hoverPoint[0]}
              y1={pad.t}
              y2={pad.t + innerH}
              stroke="var(--ink-2)"
              strokeWidth="1"
              strokeDasharray="2 3"
              opacity="0.55"
            />
            <circle
              cx={hoverPoint[0]}
              cy={hoverPoint[1]}
              r="5"
              fill="var(--bg-elev)"
              stroke={accent}
              strokeWidth="2"
            />
          </>
        )}
      </svg>

      {/* HTML tooltip — следует за точкой по вертикали, переворачивается у краёв */}
      {hoverPoint && hoverData && (() => {
        const xPct = (hoverPoint[0] / W) * 100;
        const yPct = (hoverPoint[1] / H) * 100;
        // Если точка в верхней трети — показываем tooltip ниже точки, иначе выше
        const tooltipBelow = yPct < 30;
        // Горизонтальное выравнивание у краёв, чтобы tooltip не вылезал
        let translateX = '-50%';
        if (xPct < 8) translateX = '0';
        else if (xPct > 92) translateX = '-100%';
        const translateY = tooltipBelow ? 'calc(0% + 14px)' : 'calc(-100% - 14px)';
        return (
          <div
            style={{
              position: 'absolute',
              left: `${xPct}%`,
              top: `${yPct}%`,
              transform: `translate(${translateX}, ${translateY})`,
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-md)',
              boxShadow: 'var(--shadow-2)',
              padding: '8px 12px',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 2,
            }}
          >
            <div className="t-small mono" style={{ color: 'var(--ink-3)' }}>
              {dayjs(hoverData.date)
                .format('D MMMM, dd')
                .replace(/^./, (c) => c.toUpperCase())}
            </div>
            <div className="serif tnum" style={{ fontSize: 18, lineHeight: 1.2, marginTop: 2 }}>
              {fmtMoney(hoverData.value)}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
