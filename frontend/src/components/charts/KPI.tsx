import type { ReactNode } from 'react';
import { Ic } from '../Ic';

type DeltaDir = 'up' | 'down';

interface KPIProps {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  sub?: ReactNode;
  delta?: ReactNode;
  deltaDir?: DeltaDir;
}

export function KPI({ label, value, unit, sub, delta, deltaDir }: KPIProps) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {(sub || delta) && (
        <div className="row gap-3" style={{ justifyContent: 'space-between' }}>
          <span className="t-small">{sub}</span>
          {delta && (
            <span className={`delta ${deltaDir ?? ''}`}>
              {deltaDir === 'up' && <Ic name="arrow_up" size={12} />}
              {deltaDir === 'down' && <Ic name="arrow_dn" size={12} />}
              {delta}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
