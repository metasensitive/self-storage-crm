import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { Input, Textarea } from '@/components/ui/Input';
import { Button, IconButton } from '@/components/ui/Button';
import { Ic } from '@/components/Ic';
import { useToast } from '@/components/ui/Toast';
import { supportApi, type SupportTicket } from '@/api/support';
import { queryKeys } from '@/lib/queryKeys';
import { applyApiErrors } from '@/lib/applyApiErrors';

const schema = z.object({
  subject: z.string().min(3, 'Минимум 3 символа').max(255, 'Не длиннее 255 символов'),
  body: z.string().max(5000, 'Не длиннее 5000 символов').optional(),
});

type FormValues = z.infer<typeof schema>;

interface NewTicketModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (ticket: SupportTicket) => void;
}

export function NewTicketModal({ open, onClose, onCreated }: NewTicketModalProps) {
  const qc = useQueryClient();
  const toast = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { subject: '', body: '' },
  });

  const createMut = useMutation({
    mutationFn: (data: FormValues) =>
      supportApi.tickets.create({
        subject: data.subject,
        body: data.body,
        attachments: files.length > 0 ? files : undefined,
      }),
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: queryKeys.support.all });
      onCreated(ticket);
      handleClose();
    },
    onError: (err: unknown) => {
      const general = applyApiErrors(err, form.setError, ['subject', 'body']);
      if (general) toast.error(general);
    },
  });

  function handleClose() {
    form.reset();
    setFiles([]);
    onClose();
  }

  function addFiles(incoming: File[]) {
    const next = [...files, ...incoming].slice(0, 5);
    setFiles(next);
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Новый тикет в поддержку"
      width={520}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={handleClose} disabled={createMut.isPending}>
            Отмена
          </Button>
          <Button
            variant="primary"
            loading={createMut.isPending}
            onClick={form.handleSubmit((data) => createMut.mutate(data))}
          >
            Создать тикет
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Field
          label="Тема обращения"
          error={form.formState.errors.subject?.message}
          hint="Кратко, как заголовок: «Замок на C-01 заел», «Не могу залогиниться»"
        >
          <Input autoFocus {...form.register('subject')} />
        </Field>

        <Field
          label="Сообщение"
          error={form.formState.errors.body?.message}
          hint="Можно оставить пустым, если прикрепляете файл"
        >
          <Textarea rows={5} {...form.register('body')} />
        </Field>

        <div>
          <div className="t-small dim" style={{ marginBottom: 6 }}>
            Вложения (опц.)
          </div>
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <Button
              size="sm"
              icon="paperclip"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
            >
              Прикрепить
            </Button>
            {files.map((f, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 8px',
                  background: 'var(--bg-muted)',
                  borderRadius: 'var(--r-md)',
                  fontSize: 12,
                }}
              >
                <Ic name={f.type.startsWith('image/') ? 'image' : 'file'} size={12} />
                <span
                  title={f.name}
                  style={{
                    maxWidth: 160,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {f.name}
                </span>
                <IconButton
                  icon="close"
                  iconSize={12}
                  label="Удалить"
                  onClick={() => setFiles((arr) => arr.filter((_, idx) => idx !== i))}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
