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
  /** Клик по «Ответить» — TicketView переходит в reply-режим. */
  onReply?: (message: SupportMessage) => void;
  /** Клик по reply-card — скролл к цитируемому оригиналу. */
  onJumpTo?: (messageId: number) => void;
}

export function MessageBubble({
  message,
  currentUserId,
  viewerRole,
  ticketId,
  authToken,
  hasReadByOther,
  onReply,
  onJumpTo,
}: MessageBubbleProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.body ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isMine = message.author?.id === currentUserId;
  const isDeleted = message.is_deleted;
  // Optimistic temp-сообщение из Composer'а — пока сервер не ответил,
  // у него отрицательный id. Не показываем кнопки edit/delete и не
  // отдаём read-receipt — они станут актуальны после подтверждения.
  const isPending = message.id < 0;
  const ageMin = (() => {
    const d = new Date(message.created_at);
    return Number.isNaN(d.getTime()) ? Infinity : (Date.now() - d.getTime()) / 60_000;
  })();
  const canEdit = isMine && !isDeleted && !isPending && ageMin < EDIT_WINDOW_MIN;

  // Если редактирование открыто и окно прошло — закрыть.
  useEffect(() => {
    if (editing && !canEdit) setEditing(false);
  }, [editing, canEdit]);

  const updateMut = useMutation({
    mutationFn: (body: string) => supportApi.messages.update(message.id, body),
    onSuccess: () => {
      // Достаточно перечитать messages — список тикетов last_message_preview
      // обновит invalidate ниже только если редактируется ПОСЛЕДНЕЕ
      // сообщение тикета. Чтобы не гадать, инвалидируем оба ключа.
      qc.invalidateQueries({ queryKey: queryKeys.support.messages(ticketId, currentUserId) });
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
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
      qc.invalidateQueries({ queryKey: queryKeys.support.messages(ticketId, currentUserId) });
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
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
              // Pending temp-баббл слегка приглушаем — визуальная подсказка
              // «отправляется», сразу после ответа сервера opacity вернётся.
              opacity: isPending ? 0.6 : 1,
              transition: 'opacity 0.15s',
              ...bubbleStyle,
            }}
          >
            {/* Цитата (reply) — рендерим над содержимым самого сообщения.
                Клик скроллит ленту к оригиналу. Если оригинал удалён —
                показываем плашку без активности (id может быть null). */}
            {message.reply_to && (
              <button
                type="button"
                onClick={() => {
                  if (message.reply_to?.id && onJumpTo) onJumpTo(message.reply_to.id);
                }}
                disabled={!message.reply_to.id || message.reply_to.is_deleted}
                title={
                  message.reply_to.is_deleted
                    ? 'Оригинал удалён'
                    : 'Перейти к цитируемому сообщению'
                }
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  width: '100%',
                  marginBottom: 8,
                  padding: '6px 10px',
                  background: isMine
                    ? 'rgba(255, 255, 255, 0.14)'
                    : 'var(--bg-muted)',
                  borderLeft: `3px solid ${isMine ? 'rgba(255,255,255,0.6)' : 'var(--accent)'}`,
                  borderTop: 'none',
                  borderRight: 'none',
                  borderBottom: 'none',
                  borderRadius: 6,
                  color: 'inherit',
                  cursor:
                    !message.reply_to.id || message.reply_to.is_deleted ? 'default' : 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    opacity: 0.85,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                  }}
                >
                  {authorDisplayName(message.reply_to.author ?? null, viewerRole) ?? 'Сообщение'}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.75,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%',
                    fontStyle: message.reply_to.is_deleted ? 'italic' : 'normal',
                  }}
                >
                  {message.reply_to.is_deleted
                    ? 'Сообщение удалено'
                    : message.reply_to.preview || '—'}
                </div>
              </button>
            )}

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
          {isMine && !isDeleted && !isPending && (
            <Ic name={hasReadByOther ? 'check_double' : 'check'} size={12} className="" />
          )}
          {isPending && (
            <span title="Отправляется" style={{ display: 'inline-flex' }}>
              <Ic name="clock" size={11} className="" />
            </span>
          )}
          {/* Ответить — доступно на любом нормальном (не системном,
              не удалённом, не optimistic) сообщении, включая чужие
              и собственные за пределами edit-окна. */}
          {!isDeleted && !isPending && !editing && onReply && (
            <button
              type="button"
              onClick={() => onReply(message)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                padding: 2,
              }}
              title="Ответить"
            >
              <Ic name="reply" size={12} />
            </button>
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
