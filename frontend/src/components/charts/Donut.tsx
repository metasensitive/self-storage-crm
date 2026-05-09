interface DonutSegment {
  value: number;
  color: string;
}

interface DonutProps {
  size?: number;
  thickness?: number;
  segs: DonutSegment[];
}

export function Donut({ size = 140, thickness = 14, segs }: DonutProps) {
  const total = Math.max(
    segs.reduce((s, x) => s + x.value, 0),
    1,
  );
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  let off = 0;
  const elements = segs.map((s, i) => {
    const len = (s.value / total) * c;
    const el = (
      <circle
        key={i}
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={s.color}
        strokeWidth={thickness}
        fill="none"
        strokeDasharray={`${len} ${c - len}`}
        strokeDashoffset={-off}
        strokeLinecap="butt"
      />
    );
    off += len;
    return el;
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: 'rotate(-90deg)' }}
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="var(--bg-sunken)"
        strokeWidth={thickness}
        fill="none"
      />
      {elements}
    </svg>
  );
}
