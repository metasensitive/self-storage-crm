import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Textarea } from '@/components/ui/Input';
import { Button, IconButton } from '@/components/ui/Button';
import { Ic } from '@/components/Ic';
import { useToast } from '@/components/ui/Toast';
import { supportApi } from '@/api/support';
import { queryKeys } from '@/lib/queryKeys';
import { attachmentIcon, attachmentIconColor } from './utils';

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
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {files.map((f, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 8px',
                background: 'var(--bg)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-md)',
                fontSize: 12,
              }}
            >
              <span style={{ color: attachmentIconColor(f.type, f.name), display: 'flex' }}>
                <Ic name={attachmentIcon(f.type, f.name)} size={14} />
              </span>
              <span
                style={{
                  maxWidth: 180,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={f.name}
              >
                {f.name}
              </span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                aria-label="Удалить"
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'flex',
                }}
              >
                <Ic name="close" size={12} />
              </button>
            </div>
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
