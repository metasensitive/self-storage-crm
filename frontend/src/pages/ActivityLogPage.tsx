import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Topbar } from '@/components/Topbar';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Select } from '@/components/ui/Select';
import { Ic } from '@/components/Ic';
import { activityLogsApi } from '@/api/activityLogs';
import { queryKeys } from '@/lib/queryKeys';
import { fmtDate } from '@/lib/format';
import type { ActivityAction, ActivityLog, ActivitySubjectType } from '@/api/types';

const SUBJECT_LABEL: Record<ActivitySubjectType, string> = {
  Location: 'Локация',
  Container: 'Контейнер',
  Unit: 'Кладовка',
  Rent: 'Аренда',
  User: 'Сотрудник',
};

const ACTION_LABEL: Record<ActivityAction, string> = {
  created: 'создан',
  updated: 'изменён',
  deleted: 'удалён',
};

const ACTION_COLOR: Record<ActivityAction, string> = {
  created: 'var(--st-rented, #2563eb)',
  updated: 'var(--st-reserved, #b45309)',
  deleted: 'var(--st-blocked, #b91c1c)',
};

export default function ActivityLogPage() {
  const [page, setPage] = useState(1);
  const [subjectType, setSubjectType] = useState<ActivitySubjectType | 'all'>('all');
  const [action, setAction] = useState<ActivityAction | 'all'>('all');

  const params = useMemo(
    () => ({
      page,
      ...(subjectType !== 'all' ? { subject_type: subjectType } : {}),
      ...(action !== 'all' ? { action } : {}),
    }),
    [page, subjectType, action],
  );

  const q = useQuery({
    queryKey: queryKeys.activityLogs.list(params),
    queryFn: () => activityLogsApi.list(params),
  });

  const items = q.data?.data ?? [];
  const meta = q.data?.meta;

  return (
    <>
      <Topbar crumbs={['Журнал действий']} />
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">Аудит</span>
            <h1 className="h-display">Журнал действий</h1>
            <span className="muted t-body">
              {meta ? `${meta.total} записей` : 'История изменений в системе.'}
            </span>
          </div>
        </div>

        <div className="row gap-2 mb-4" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
          <Select
            value={subjectType}
            onChange={(e) => {
              setSubjectType(e.target.value as ActivitySubjectType | 'all');
              setPage(1);
            }}
            style={{ width: 220 }}
          >
            <option value="all">Все типы объектов</option>
            {(Object.keys(SUBJECT_LABEL) as ActivitySubjectType[]).map((k) => (
              <option key={k} value={k}>
                {SUBJECT_LABEL[k]}
              </option>
            ))}
          </Select>
          <Select
            value={action}
            onChange={(e) => {
              setAction(e.target.value as ActivityAction | 'all');
              setPage(1);
            }}
            style={{ width: 220 }}
          >
            <option value="all">Все действия</option>
            {(Object.keys(ACTION_LABEL) as ActivityAction[]).map((k) => (
              <option key={k} value={k}>
                {ACTION_LABEL[k]}
              </option>
            ))}
          </Select>
        </div>

        {q.isLoading ? (
          <LoadingState label="Загрузка журнала…" />
        ) : q.error ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : items.length === 0 ? (
          <Empty
            title="Записей пока нет"
            hint="Действия пользователей будут появляться здесь по мере их выполнения."
          />
        ) : (
          <div className="col" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
          </div>
        )}

        {meta && meta.last_page > 1 && (
          <div
            className="row gap-2 mt-6"
            style={{ justifyContent: 'center', alignItems: 'center' }}
          >
            <Button
              size="sm"
              icon="chev_l"
              disabled={meta.current_page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </Button>
            <span className="t-small mono tnum" style={{ minWidth: 60, textAlign: 'center' }}>
              {meta.current_page} / {meta.last_page}
            </span>
            <Button
              size="sm"
              iconRight="chev_r"
              disabled={meta.current_page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              Дальше
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function LogRow({ log }: { log: ActivityLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasChanges = log.changes && (log.changes.old || log.changes.new);

  return (
    <div
      className="card"
      style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
        padding: 14,
      }}
    >
      <div className="row" style={{ alignItems: 'center', gap: 12 }}>
        {log.user ? (
          <Avatar name={log.user.name} src={log.user.avatar_url} />
        ) : (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              background: 'var(--bg)',
              border: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ic name="user" size={14} />
          </div>
        )}
        <div className="col grow" style={{ minWidth: 0 }}>
          <div className="t-body">
            <strong>{log.user?.name ?? 'Система'}</strong>{' '}
            <span style={{ color: ACTION_COLOR[log.action] }}>{ACTION_LABEL[log.action]}</span>{' '}
            <span className="muted">{SUBJECT_LABEL[log.subject_type]?.toLowerCase()}</span>{' '}
            <strong>{log.subject_label ?? `#${log.subject_id}`}</strong>
          </div>
          <div className="t-small dim mt-1 row gap-3" style={{ flexWrap: 'wrap' }}>
            <span>{fmtDate(log.created_at)}</span>
            {log.ip_address && (
              <span className="mono" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {log.ip_address}
              </span>
            )}
          </div>
        </div>
        {hasChanges && log.action !== 'created' && (
          <Button
            size="sm"
            variant="ghost"
            icon={expanded ? 'arrow_up' : 'arrow_dn'}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Свернуть' : 'Детали'}
          </Button>
        )}
      </div>

      {expanded && hasChanges && (
        <div
          className="mt-3"
          style={{
            marginTop: 12,
            padding: 12,
            background: 'var(--bg)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)',
            fontFamily: 'monospace',
            fontSize: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <ChangesDiff log={log} />
        </div>
      )}
    </div>
  );
}

function ChangesDiff({ log }: { log: ActivityLog }) {
  const { old: oldVals, new: newVals } = log.changes ?? {};
  const keys = new Set<string>([
    ...Object.keys(oldVals ?? {}),
    ...Object.keys(newVals ?? {}),
  ]);

  if (keys.size === 0) {
    return <span className="dim">Без изменений</span>;
  }

  return (
    <>
      {[...keys].map((key) => {
        const oldV = oldVals?.[key];
        const newV = newVals?.[key];
        return (
          <div key={key} className="row" style={{ gap: 8, alignItems: 'baseline' }}>
            <span className="dim" style={{ minWidth: 140 }}>
              {key}
            </span>
            {log.action === 'updated' ? (
              <>
                <span style={{ color: 'var(--st-blocked, #b91c1c)' }}>{formatValue(oldV)}</span>
                <Ic name="chev_r" size={12} />
                <span style={{ color: 'var(--st-rented, #2563eb)' }}>{formatValue(newV)}</span>
              </>
            ) : log.action === 'deleted' ? (
              <span style={{ color: 'var(--st-blocked, #b91c1c)' }}>{formatValue(oldV)}</span>
            ) : (
              <span>{formatValue(newV)}</span>
            )}
          </div>
        );
      })}
    </>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
