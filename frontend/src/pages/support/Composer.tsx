import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/Input';
import { Button, IconButton } from '@/components/ui/Button';
import { Ic } from '@/components/Ic';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/contexts/AuthContext';
import { supportApi, type MessagesListResponse, type SupportMessage } from '@/api/support';
import { queryKeys } from '@/lib/queryKeys';
import { attachmentIcon, attachmentIconColor, attachmentLabel } from './utils';

const MAX_FILES = 5;
const MAX_KB = 10240;

interface ComposerProps {
  ticketId: number;
  currentUserId: number;
  /** Если тикет закрыт — композер задизаблен с подсказкой. */
  disabled?: boolean;
  disabledHint?: string;
}

/**
 * Поле отправки сообщения. Auto-grow textarea, прикрепление файлов
 * через кнопку или drag&drop, превью выбранных, Ctrl/Cmd+Enter отправляет.
 */
// Высоты композера: при пустом инпуте — одна строка, по мере набора
// растём до ~10 визуальных строк, дальше включается скролл. scrollHeight
// учитывает реальный wrap-перенос (одна логическая строка из 200 символов
// рендерится как несколько визуальных) — поэтому работает лучше, чем
// rows={text.split('\n').length}.
const COMPOSER_MIN_H = 40;
const COMPOSER_MAX_H = 200;

// Дебаунс typing-сигнала: шлём не чаще одного раза в 3 сек, пока
// пользователь набирает текст. Слушатели держат индикатор 5 сек
// после последнего полученного события — значит при активном наборе
// мы как минимум раз в 3 сек продлеваем индикатор у собеседника.
const TYPING_THROTTLE_MS = 3000;

export function Composer({ ticketId, currentUserId, disabled, disabledHint }: ComposerProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const { user } = useAuth();
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTypingSentRef = useRef<number>(0);

  // Дебаунсированный пуш typing-сигнала. Бросаем, только если в инпуте
  // что-то есть (стирание до пустоты — не «набираю»). Ошибки молча
  // глотаем: индикатор не критичен, не должен мешать UX композера.
  function pushTyping(nextBody: string) {
    if (disabled) return;
    if (nextBody.trim().length === 0) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current < TYPING_THROTTLE_MS) return;
    lastTypingSentRef.current = now;
    supportApi.tickets.typing(ticketId).catch(() => {});
  }

  // Auto-grow: пересчитываем высоту на каждое изменение body. Сбрасываем
  // в 'auto' чтобы scrollHeight отражал реальный content height, затем
  // зажимаем в [MIN, MAX] и включаем скролл только при превышении.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(Math.max(el.scrollHeight, COMPOSER_MIN_H), COMPOSER_MAX_H);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > COMPOSER_MAX_H ? 'auto' : 'hidden';
  }, [body]);

  // Optimistic UI на отправку сообщения.
  //
  // До этого фикса пользователь жал «Отправить», composer очищался, но
  // сообщение появлялось в ленте только после POST → invalidate → refetch.
  // На сетевой 200-500ms + дополнительный roundtrip за refetch — выходило
  // 1-2 сек видимой задержки даже на быстром бэке.
  //
  // Теперь:
  //  1. onMutate — кладём фейковый message с tempId (отрицательным,
  //     чтобы не конфликтовать с серверными id) в кэш мгновенно. UI
  //     перерисовывается сразу — сообщение появляется в ленте до того,
  //     как сервер ответил.
  //  2. onSuccess — точечно подменяем temp на серверный объект
  //     (queryData-merge без refetch'а). Для списка тикетов
  //     дополнительно инвалидируем — там обновится last_message_preview.
  //  3. onError — откатываем temp, показываем toast.
  //
  // Если параллельно по ws прилетит broadcast 'message.created' от
  // самого себя, useSupportTicketChannel инвалидирует messages и
  // refetch подтянет server-truth — temp в любом случае останется
  // согласованным с реальным сообщением.
  const sendMut = useMutation({
    mutationFn: (payload: { body?: string; attachments?: File[] }) =>
      supportApi.messages.send(ticketId, payload),
    onMutate: async (payload) => {
      const queryKey = queryKeys.support.messages(ticketId, currentUserId);
      // Отменяем in-flight рефетчи, чтобы они не затёрли наш optimistic data.
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<MessagesListResponse>(queryKey);

      const tempId = -Date.now(); // отрицательный → не пересечётся с реальным
      const now = new Date().toISOString();
      const tempMessage: SupportMessage = {
        id: tempId,
        type: 'message',
        body: payload.body ?? null,
        is_deleted: false,
        author: user
          ? {
              id: user.id,
              name: user.name,
              role: user.role,
              avatar_url: user.avatar_url,
            }
          : undefined,
        attachments: (payload.attachments ?? []).map((f, i) => ({
          id: -(Date.now() + i + 1),
          original_name: f.name,
          mime: f.type || 'application/octet-stream',
          size_bytes: f.size,
          is_image: f.type.startsWith('image/'),
          // Реальный download_url придёт с сервера; до подтверждения
          // оставляем пустой, AttachmentPreview всё равно не сможет
          // ничего скачать — но имя/иконку покажет.
          download_url: '',
        })),
        edited_at: null,
        deleted_at: null,
        read_by: [],
        created_at: now,
      };

      qc.setQueryData<MessagesListResponse>(queryKey, (old) => {
        // API отдаёт сообщения desc (новые сверху) — добавляем temp в начало.
        if (!old) {
          return { data: [tempMessage], meta: { next_cursor: null, has_more: false } };
        }
        return { ...old, data: [tempMessage, ...old.data] };
      });

      // Composer очищаем сразу — мы оптимистично уверены в успехе.
      setBody('');
      setFiles([]);

      return { previous, tempId, queryKey };
    },
    onSuccess: (serverMessage, _vars, ctx) => {
      if (!ctx) return;
      // Точечная подмена temp на серверное сообщение — без refetch'а.
      qc.setQueryData<MessagesListResponse>(ctx.queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((m) => (m.id === ctx.tempId ? serverMessage : m)),
        };
      });
      // Список тикетов — там last_message_preview/last_message_at
      // изменились. Инвалидируем только tickets, без messages/unread.
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
    onError: (err: unknown, _vars, ctx) => {
      // Откатываем optimistic state. Composer уже очищен — на ошибке
      // покажем тост, юзер сам решит написать заново.
      if (ctx?.previous) {
        qc.setQueryData(ctx.queryKey, ctx.previous);
      } else if (ctx) {
        qc.setQueryData<MessagesListResponse>(ctx.queryKey, (old) => {
          if (!old) return old;
          return { ...old, data: old.data.filter((m) => m.id !== ctx.tempId) };
        });
      }
      const m = err instanceof Error ? err.message : 'Не удалось отправить';
      toast.error(m);
    },
  });

  const canSend = !disabled && !sendMut.isPending && (body.trim().length > 0 || files.length > 0);
  void currentUserId;

  function addFiles(incoming: File[]) {
    if (incoming.length === 0) return;
    const next = [...files];
    for (const f of incoming) {
      if (next.length >= MAX_FILES) {
        toast.error(`Не больше ${MAX_FILES} файлов`);
        break;
      }
      if (f.size > MAX_KB * 1024) {
        toast.error(`«${f.name}» больше ${MAX_KB / 1024} МБ`);
        continue;
      }
      next.push(f);
    }
    setFiles(next);
  }

  function removeFile(i: number) {
    setFiles((arr) => arr.filter((_, idx) => idx !== i));
  }

  function submit() {
    if (!canSend) return;
    sendMut.mutate({
      body: body.trim() || undefined,
      attachments: files.length > 0 ? files : undefined,
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  }

  /**
   * Paste из буфера. Если в clipboard есть image (например, скриншот
   * через Win+Shift+S или PrintScreen) — добавляем как файл-вложение.
   * Простой текст оставляем стандартному behavior textarea.
   */
  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pasted: File[] = [];
    for (const it of items) {
      if (it.kind === 'file' && it.type.startsWith('image/')) {
        const file = it.getAsFile();
        if (file) {
          // Дадим понятное имя — clipboard-картинки обычно безымянные.
          const ext = file.type.split('/')[1] ?? 'png';
          const named = new File([file], `screenshot-${Date.now()}.${ext}`, {
            type: file.type,
          });
          pasted.push(named);
        }
      }
    }
    if (pasted.length > 0) {
      e.preventDefault();
      addFiles(pasted);
    }
  }

  if (disabled) {
    return (
      <div
        style={{
          padding: '14px 16px',
          background: 'var(--bg-muted)',
          borderTop: '1px solid var(--line)',
          textAlign: 'center',
          color: 'var(--ink-3)',
        }}
        className="t-small"
      >
        <Ic name="lock" size={14} /> {disabledHint ?? 'Отправка недоступна'}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        addFiles(Array.from(e.dataTransfer.files ?? []));
      }}
      style={{
        padding: 14,
        borderTop: '1px solid var(--line)',
        background: dragging ? 'var(--bg-muted)' : 'var(--bg-elev)',
        transition: 'background .12s',
      }}
    >
      {files.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 10,
            alignItems: 'flex-start',
          }}
        >
          {files.map((f, i) => (
            <PendingAttachment key={i} file={f} onRemove={() => removeFile(i)} />
          ))}
        </div>
      )}

      {/* Composer row: всё фиксированной высоты 40px при одной строке текста,
          alignItems: flex-end — при многострочном вводе textarea растёт вверх,
          а скрепка и «Отправить» остаются прижатыми к нижнему краю. */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            addFiles(Array.from(e.target.files ?? []));
            if (fileInputRef.current) fileInputRef.current.value = '';
          }}
        />
        <IconButton
          icon="paperclip"
          label="Прикрепить файл"
          onClick={() => fileInputRef.current?.click()}
          style={{ width: 40, height: 40, flexShrink: 0 }}
        />
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => {
            const v = e.target.value;
            setBody(v);
            pushTyping(v);
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder="Напишите сообщение… (Ctrl+Enter — отправить, Ctrl+V — вставить скриншот)"
          rows={1}
          style={{
            flex: 1,
            resize: 'none',
            minHeight: COMPOSER_MIN_H,
            maxHeight: COMPOSER_MAX_H,
            padding: '9px 12px',
            lineHeight: 1.4,
            // overflowY ставится из useEffect (auto при переполнении,
            // hidden пока высота не достигла MAX) — здесь дефолт hidden.
            overflowY: 'hidden',
          }}
        />
        <Button
          variant="primary"
          icon="send"
          loading={sendMut.isPending}
          disabled={!canSend}
          onClick={submit}
          style={{ height: 40, flexShrink: 0 }}
        >
          Отправить
        </Button>
      </div>
    </div>
  );
}

/**
 * Превью одного выбранного вложения до отправки.
 *
 * Картинки рендерятся миниатюрой 64×64 через object-URL самого File
 * (не дёргаем сеть — файл уже на клиенте). При наведении всплывает крупное
 * превью оригинала рядом с миниатюрой. Кнопка ✕ удаляет из списка.
 *
 * Не-картинки — компактный чип с цветной иконкой по типу файла и именем.
 */
function PendingAttachment({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith('image/');
  const [src, setSrc] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!isImage) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isImage]);

  if (isImage) {
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ position: 'relative' }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 'var(--r-md)',
            overflow: 'hidden',
            border: '1px solid var(--line)',
            background: 'var(--bg-muted)',
            position: 'relative',
          }}
          title={file.name}
        >
          {src ? (
            <img
              src={src}
              alt={file.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ic name="image" size={18} />
            </div>
          )}
          <button
            type="button"
            onClick={onRemove}
            aria-label="Удалить"
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 18,
              height: 18,
              borderRadius: 999,
              background: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <Ic name="close" size={10} />
          </button>
        </div>

        {hovered && src && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              bottom: 'calc(100% + 8px)',
              background: 'var(--bg-elev)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--r-md)',
              boxShadow: 'var(--shadow-3, 0 12px 32px rgba(0,0,0,0.25))',
              padding: 4,
              zIndex: 50,
              pointerEvents: 'none',
            }}
          >
            <img
              src={src}
              alt={file.name}
              style={{
                display: 'block',
                maxWidth: 420,
                maxHeight: 320,
                objectFit: 'contain',
                borderRadius: 'var(--r-sm)',
              }}
            />
          </div>
        )}
      </div>
    );
  }

  // Не-картинка: компактный чип, выровненный по высоте картинки-миниатюры
  // (64 px) — обе формы вложений в одной строке смотрятся ровно.
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 8px 0 0',
        background: 'var(--bg)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        height: 64,
        maxWidth: 220,
        overflow: 'hidden',
      }}
      title={file.name}
    >
      <span
        style={{
          color: attachmentIconColor(file.type, file.name),
          background: 'var(--bg-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: '100%',
          borderRight: '1px solid var(--line)',
          flexShrink: 0,
        }}
      >
        <Ic name={attachmentIcon(file.type, file.name)} size={18} />
      </span>
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            color: 'var(--ink)',
          }}
        >
          {file.name}
        </span>
        <span className="t-small dim" style={{ fontSize: 11 }}>
          {attachmentLabel(file.type, file.name)}
        </span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Удалить"
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 2,
          display: 'flex',
          color: 'var(--ink-3)',
          flexShrink: 0,
        }}
      >
        <Ic name="close" size={12} />
      </button>
    </div>
  );
}
