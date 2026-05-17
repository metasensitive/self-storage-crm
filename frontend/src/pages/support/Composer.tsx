import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/Input';
import { Button, IconButton } from '@/components/ui/Button';
import { Ic } from '@/components/Ic';
import { useToast } from '@/components/ui/Toast';
import { supportApi } from '@/api/support';
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
export function Composer({ ticketId, currentUserId, disabled, disabledHint }: ComposerProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const [body, setBody] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sendMut = useMutation({
    mutationFn: (payload: { body?: string; attachments?: File[] }) =>
      supportApi.messages.send(ticketId, payload),
    onSuccess: () => {
      setBody('');
      setFiles([]);
      qc.invalidateQueries({ queryKey: queryKeys.support.all });
    },
    onError: (err: unknown) => {
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
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder="Напишите сообщение… (Ctrl+Enter — отправить, Ctrl+V — вставить скриншот)"
          rows={Math.min(6, Math.max(1, body.split('\n').length))}
          style={{ flex: 1, resize: 'none' }}
        />
        <Button
          variant="primary"
          icon="send"
          loading={sendMut.isPending}
          disabled={!canSend}
          onClick={submit}
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
