import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Ic } from '@/components/Ic';
import { Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { supportApi, type SupportMessage } from '@/api/support';
import { queryKeys } from '@/lib/queryKeys';
import { initials } from '@/lib/format';
import type { Role } from '@/api/types';
import { AttachmentPreview } from './AttachmentPreview';
import { authorDisplayName } from './utils';
import { fmtTime } from './time';

/** Окно редактирования совпадает с бэкенд-настройкой 10 мин. */
const EDIT_WINDOW_MIN = 10;

interface MessageBubbleProps {
  message: SupportMessage;
  currentUserId: number;
  viewerRole: Role | null;
  ticketId: number;
  authToken: string | null;
  /** Сообщение прочитано хотя бы одним получателем (для двойной галочки). */
  hasReadByOther: boolean;
}

// Время бабла рендерим через fmtTime (Intl, локальный TZ браузера).

export function MessageBubble({
  message,
  currentUserId,
  viewerRole,
  ticketId,
  authToken,
  hasReadByOther,
}: MessageBubbleProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body ?? '');

  const isMine = message.author?.id === currentUserId;
  const isDeleted = message.is_deleted;
  const ageMin = (() => {
    const d = new Date(message.created_at);
    return Number.isNaN(d.getTime()) ? Infinity : (Date.now() - d.getTime()) / 60_000;
  })();
  const canEdit = isMine && !isDeleted && ageMin < EDIT_WINDOW_MIN;

  // Если редактирование открыто и окно прошло — закрыть.
  useEffect(() => {
    if (editing && !canEdit) setEditing(false);
  }, [editing, canEdit]);

  const updateMut = useMutation({
    mutationFn: (body: string) => supportApi.messages.update(message.id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.support.messages(ticketId, currentUserId) });
      setEditing(false);
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : 'Не удалось обновить';
      toast.error(m);
    },
  });

  const deleteMut = useMutation({
    mutationFn: () => supportApi.messages.delete(message.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.support.all });
    },
    onError: (err: unknown) => {
      const m = err instanceof Error ? err.message : 'Не удалось удалить';
      toast.error(m);
    },
  });

  const role = message.author?.role;
  // Для менеджера маскируем имя любого админа как «Администратор» — он не
  // должен видеть, сколько людей в саппорте и кто именно отвечает. Аватар
  // тоже маскируем: показываем инициал «А» вместо реального аватара.
  const displayedName = authorDisplayName(message.author, viewerRole) ?? 'Аноним';
  const maskAdmin = viewerRole === 'manager' && role === 'admin';
  const avatarSrc = maskAdmin ? null : message.author?.avatar_url;
  const avatarName = maskAdmin ? 'Администратор' : message.author?.name;
  void initials; // используется в Avatar

  // Цвета бабла: свои — акцентом, чужие — нейтральные. У админа лёгкий
  // визуальный маркер ролью (только для чужих сообщений админа).
  const bubbleStyle: React.CSSProperties = isMine
    ? {
        background: 'var(--accent)',
        color: 'var(--accent-fg)',
        borderColor: 'transparent',
      }
    : {
        background: 'var(--bg-elev)',
        color: 'var(--ink)',
        borderColor: 'var(--line)',
      };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isMine ? 'row-reverse' : 'row',
        gap: 8,
        alignItems: 'flex-end',
      }}
    >
      {!isMine && <Avatar name={avatarName} src={avatarSrc} />}

      <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {!isMine && (
          <div className="t-small dim" style={{ paddingLeft: 4 }}>
            {displayedName}
            {role === 'admin' && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 10,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  padding: '1px 6px',
                  background: 'var(--bg-muted)',
                  borderRadius: 999,
                }}
              >
                админ
              </span>
            )}
          </div>
        )}

        <div
          style={{
            padding: '8px 12px',
            border: '1px solid',
            borderRadius: 14,
            borderBottomRightRadius: isMine ? 4 : 14,
            borderBottomLeftRadius: isMine ? 14 : 4,
            ...bubbleStyle,
          }}
        >
          {isDeleted ? (
            <div className="t-body" style={{ fontStyle: 'italic', opacity: 0.7 }}>
              Сообщение удалено
            </div>
          ) : editing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 240 }}>
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                style={{ color: 'var(--ink)' }}
              />
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDraft(message.body ?? '');
                    setEditing(false);
                  }}
                >
                  Отмена
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  loading={updateMut.isPending}
                  disabled={!draft.trim() || draft.trim() === message.body}
                  onClick={() => updateMut.mutate(draft.trim())}
                >
                  Сохранить
                </Button>
              </div>
            </div>
          ) : (
            <>
              {message.body && (
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {message.body}
                </div>
              )}
              {message.attachments.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    marginTop: message.body ? 8 : 0,
                  }}
                >
                  {message.attachments.map((a) => (
                    <AttachmentPreview key={a.id} attachment={a} authToken={authToken} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div
          className="t-small dim"
          style={{
            display: 'flex',
            gap: 6,
            justifyContent: isMine ? 'flex-end' : 'flex-start',
            alignItems: 'center',
            padding: '0 4px',
          }}
        >
          {message.edited_at && !isDeleted && <span title="Изменено">(изменено)</span>}
          <span>{fmtTime(message.created_at)}</span>
          {isMine && !isDeleted && (
            <Ic
              name={hasReadByOther ? 'check_double' : 'check'}
              size={12}
              className=""
            />
          )}
          {canEdit && !editing && !isDeleted && (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: 2,
                }}
                title="Редактировать"
              >
                <Ic name="edit" size={12} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Удалить сообщение?')) deleteMut.mutate();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  padding: 2,
                }}
                title="Удалить"
              >
                <Ic name="trash" size={12} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
