import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Ic } from '@/components/Ic';
import { Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
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
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      setConfirmDelete(false);
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

  const canSaveEdit =
    !!draft.trim() && draft.trim() !== (message.body ?? '') && !updateMut.isPending;

  function cancelEdit() {
    setDraft(message.body ?? '');
    setEditing(false);
  }
  function saveEdit() {
    if (!canSaveEdit) return;
    updateMut.mutate(draft.trim());
  }
  function onEditKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }

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

      <div
        style={{
          maxWidth: '70%',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          alignItems: isMine ? 'flex-end' : 'flex-start',
        }}
      >
        {!isMine && (
          <div className="t-small dim" style={{ paddingLeft: 4 }}>
            {displayedName}
          </div>
        )}

        {editing ? (
          /* Режим редактирования — отдельный нейтральный контейнер вместо
             акцентного бабла. На цветной подложке ghost-кнопка «Отмена»
             терялась (white-on-white). Контейнер с явными bg/border/ink-цветами
             даёт читаемый контраст для обеих кнопок. */
          <div
            style={{
              width: 360,
              maxWidth: '100%',
              background: 'var(--bg-elev)',
              color: 'var(--ink)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              borderBottomRightRadius: isMine ? 4 : 14,
              borderBottomLeftRadius: isMine ? 14 : 4,
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onEditKeyDown}
              rows={Math.min(8, Math.max(2, draft.split('\n').length))}
              autoFocus
              style={{
                width: '100%',
                resize: 'none',
                minHeight: 60,
                maxHeight: 220,
              }}
            />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span className="t-small dim" style={{ flex: 1 }}>
                Ctrl+Enter — сохранить, Esc — отменить
              </span>
              <Button size="sm" variant="ghost" onClick={cancelEdit}>
                Отмена
              </Button>
              <Button
                size="sm"
                variant="primary"
                loading={updateMut.isPending}
                disabled={!canSaveEdit}
                onClick={saveEdit}
              >
                Сохранить
              </Button>
            </div>
          </div>
        ) : (
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
        )}

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
            <Ic name={hasReadByOther ? 'check_double' : 'check'} size={12} className="" />
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
                onClick={() => setConfirmDelete(true)}
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

      <Modal
        open={confirmDelete}
        onClose={() => !deleteMut.isPending && setConfirmDelete(false)}
        title="Удалить сообщение?"
        width={420}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button
              variant="ghost"
              disabled={deleteMut.isPending}
              onClick={() => setConfirmDelete(false)}
            >
              Отмена
            </Button>
            <Button
              variant="danger"
              icon="trash"
              loading={deleteMut.isPending}
              onClick={() => deleteMut.mutate()}
            >
              Удалить
            </Button>
          </div>
        }
      >
        <p className="t-body">
          Сообщение будет помечено как удалённое. У собеседника вместо текста
          отобразится «Сообщение удалено».
        </p>
      </Modal>
    </div>
  );
}
