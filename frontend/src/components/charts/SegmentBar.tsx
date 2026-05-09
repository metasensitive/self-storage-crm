interface SegmentBarProps {
  free?: number;
  rented?: number;
  reserved?: number;
  blocked?: number;
  height?: number;
}

export function SegmentBar({
  free = 0,
  rented = 0,
  reserved = 0,
  blocked = 0,
  height = 6,
}: SegmentBarProps) {
  const total = Math.max(free + rented + reserved + blocked, 1);

  const seg = (n: number, color: string, key: string) =>
    n > 0 && (
      <span
        key={key}
        title={String(n)}
        style={{ width: `${(n / total) * 100}%`, background: color, display: 'block', height: '100%' }}
      />
    );

  return (
    <div className="bar" style={{ height }}>
      {seg(rented, 'var(--st-rented)', 'r')}
      {seg(reserved, 'var(--st-reserved)', 'rs')}
      {seg(free, 'var(--st-free)', 'f')}
      {seg(blocked, 'var(--st-blocked)', 'b')}
    </div>
  );
}
