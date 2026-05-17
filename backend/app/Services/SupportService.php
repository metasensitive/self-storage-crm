<?php

namespace App\Services;

use App\Events\Support\SupportMessageCreated;
use App\Events\Support\SupportTicketCreated;
use App\Events\Support\SupportTicketUpdated;
use App\Models\SupportAttachment;
use App\Models\SupportMessage;
use App\Models\SupportMessageRead;
use App\Models\SupportTicket;
use App\Models\User;
use App\Notifications\SupportMessageNotification;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Throwable;

/**
 * Доменная логика чата поддержки. По договорённости с проектом — собирает в
 * одном месте всё, что выходит за «один CRUD»: вложения, реалтайм, нотификации.
 */
class SupportService
{
    /**
     * Менеджер создаёт тикет с первым сообщением. Тикет, сообщение и вложения
     * пишутся в одной транзакции; broadcast и уведомления — после commit'а.
     *
     * @param UploadedFile[] $files
     */
    public function createTicket(User $manager, string $subject, ?string $body, array $files = []): SupportTicket
    {
        $ticket = DB::transaction(function () use ($manager, $subject, $body, $files) {
            $ticket = SupportTicket::create([
                'manager_id' => $manager->id,
                'subject' => $subject,
                'status' => SupportTicket::STATUS_OPEN,
            ]);

            $message = $this->writeMessage($ticket, $manager, $body, $files);
            $this->touchLastMessage($ticket, $message);

            return $ticket->fresh();
        });

        // После commit'а — реалтайм и нотификации (best-effort, как везде).
        $this->broadcastSafe(fn() => broadcast(new SupportTicketCreated($ticket->id, $manager->id)));
        $this->notifyRecipients($ticket, $ticket->lastMessage, $manager);

        return $ticket;
    }

    /**
     * Любая сторона отправляет сообщение в существующий тикет.
     *
     * @param UploadedFile[] $files
     */
    public function sendMessage(SupportTicket $ticket, User $author, ?string $body, array $files = []): SupportMessage
    {
        if ($ticket->isClosed()) {
            throw new InvalidArgumentException('Тикет закрыт — сообщения недоступны');
        }

        $message = DB::transaction(function () use ($ticket, $author, $body, $files) {
            $message = $this->writeMessage($ticket, $author, $body, $files);
            $this->touchLastMessage($ticket, $message);
            return $message;
        });

        $this->broadcastSafe(fn() => broadcast(new SupportMessageCreated($ticket->id, $message->id, $author->id)));
        $this->notifyRecipients($ticket, $message, $author);

        return $message;
    }

    /**
     * Отметить все непрочитанные сообщения тикета как прочитанные для пользователя.
     * Свои сообщения и уже прочитанные пропускаем (idempotent).
     */
    public function markRead(SupportTicket $ticket, User $reader): int
    {
        $unread = $ticket->messages()
            ->where('author_id', '!=', $reader->id)
            ->whereNotIn('id', function ($sub) use ($reader) {
                $sub->select('message_id')
                    ->from('support_message_reads')
                    ->where('user_id', $reader->id);
            })
            ->pluck('id');

        if ($unread->isEmpty()) {
            return 0;
        }

        $now = now();
        $rows = $unread->map(fn($id) => [
            'message_id' => $id,
            'user_id' => $reader->id,
            'read_at' => $now,
        ])->all();

        // insert вместо upsert — мы уже отфильтровали уже-прочитанные.
        SupportMessageRead::insert($rows);

        $this->broadcastSafe(fn() => broadcast(new SupportTicketUpdated($ticket->id, 'read')));

        return count($rows);
    }

    /** Редактирование своего сообщения в окне 10 минут. */
    public function updateMessage(SupportMessage $message, User $editor, string $body): SupportMessage
    {
        $this->assertCanEdit($message, $editor);

        $message->update([
            'body' => $body,
            'edited_at' => now(),
        ]);

        // last_message_preview обновим только если правится последнее сообщение тикета.
        $ticket = $message->ticket;
        if ($ticket && $ticket->lastMessage && (int) $ticket->lastMessage->id === (int) $message->id) {
            $ticket->update([
                'last_message_preview' => $this->buildPreview($message->fresh()),
            ]);
        }

        $this->broadcastSafe(fn() => broadcast(new SupportTicketUpdated($message->ticket_id, 'edited')));

        return $message->fresh();
    }

    /** Soft-delete своего сообщения в окне 10 минут. */
    public function deleteMessage(SupportMessage $message, User $editor): void
    {
        $this->assertCanEdit($message, $editor);

        $message->delete();

        $ticket = $message->ticket;
        if ($ticket && $ticket->lastMessage && (int) $ticket->lastMessage->id === (int) $message->id) {
            // Сообщение удалили — пересчитаем превью на новое «последнее».
            $latest = $ticket->messages()->latest('created_at')->first();
            $ticket->update([
                'last_message_at' => $latest?->created_at,
                'last_message_preview' => $latest ? $this->buildPreview($latest) : null,
            ]);
        }

        $this->broadcastSafe(fn() => broadcast(new SupportTicketUpdated($message->ticket_id, 'deleted')));
    }

    public function closeTicket(SupportTicket $ticket, User $by): SupportTicket
    {
        if ($ticket->isClosed()) {
            return $ticket;
        }
        DB::transaction(function () use ($ticket, $by) {
            $ticket->update([
                'status' => SupportTicket::STATUS_CLOSED,
                'closed_at' => now(),
                'closed_by' => $by->id,
            ]);
            // Системное сообщение в ленту чата — чтобы и админ, и менеджер
            // видели, кто и когда закрыл тикет. last_message_* не трогаем —
            // системные события не должны менять превью в списке тикетов.
            SupportMessage::create([
                'ticket_id' => $ticket->id,
                'author_id' => $by->id,
                'type' => SupportMessage::TYPE_SYSTEM_CLOSED,
                'body' => null,
            ]);
        });
        $this->broadcastSafe(fn() => broadcast(new SupportTicketUpdated($ticket->id, 'status')));
        return $ticket->fresh();
    }

    public function reopenTicket(SupportTicket $ticket, User $by): SupportTicket
    {
        if (!$ticket->isClosed()) {
            return $ticket;
        }
        DB::transaction(function () use ($ticket, $by) {
            $ticket->update([
                'status' => SupportTicket::STATUS_OPEN,
                'closed_at' => null,
                'closed_by' => null,
            ]);
            SupportMessage::create([
                'ticket_id' => $ticket->id,
                'author_id' => $by->id,
                'type' => SupportMessage::TYPE_SYSTEM_REOPENED,
                'body' => null,
            ]);
        });
        $this->broadcastSafe(fn() => broadcast(new SupportTicketUpdated($ticket->id, 'status')));
        return $ticket->fresh();
    }

    // ───── internals ────────────────────────────────────────────────────────

    /** Создать запись сообщения + вложения (внутри транзакции). */
    private function writeMessage(SupportTicket $ticket, User $author, ?string $body, array $files): SupportMessage
    {
        $message = SupportMessage::create([
            'ticket_id' => $ticket->id,
            'author_id' => $author->id,
            'body' => $body,
        ]);

        if (!empty($files)) {
            $this->storeAttachments($message, $files);
        }

        return $message->fresh(['attachments']);
    }

    /**
     * Сохранить файлы на приватный диск и записать в support_attachments.
     *
     * @param UploadedFile[] $files
     */
    private function storeAttachments(SupportMessage $message, array $files): void
    {
        $disk = config('support.attachments.disk', 'local');

        foreach ($files as $file) {
            if (!$file instanceof UploadedFile) {
                continue;
            }
            $filename = Str::uuid()->toString() . '_' . $file->getClientOriginalName();
            $dir = "support/{$message->ticket_id}/{$message->id}";
            $path = Storage::disk($disk)->putFileAs($dir, $file, $filename);

            SupportAttachment::create([
                'message_id' => $message->id,
                'disk' => $disk,
                'path' => $path,
                'original_name' => $file->getClientOriginalName(),
                'mime' => $file->getMimeType() ?: 'application/octet-stream',
                'size_bytes' => $file->getSize() ?: 0,
            ]);
        }
    }

    /** Обновить денормализованные last_message_* в тикете. */
    private function touchLastMessage(SupportTicket $ticket, SupportMessage $message): void
    {
        $ticket->update([
            'last_message_at' => $message->created_at,
            'last_message_preview' => $this->buildPreview($message),
        ]);
    }

    private function buildPreview(SupportMessage $message): string
    {
        if (!empty($message->body)) {
            return mb_substr($message->body, 0, 280);
        }
        $count = $message->attachments()->count();
        return $count > 0 ? "📎 Вложение ({$count})" : '';
    }

    private function assertCanEdit(SupportMessage $message, User $editor): void
    {
        if ((int) $message->author_id !== (int) $editor->id) {
            abort(403, 'Можно редактировать только свои сообщения');
        }
        if (!$message->isWithinEditWindow()) {
            $minutes = (int) config('support.edit_window_minutes', 10);
            abort(403, "Сообщение нельзя править — прошло больше {$minutes} мин");
        }
    }

    /**
     * Кому слать in-app уведомление о новом сообщении:
     * автор-менеджер → всем админам; автор-админ → владельцу тикета (менеджеру).
     */
    private function notifyRecipients(SupportTicket $ticket, SupportMessage $message, User $sender): void
    {
        $notification = new SupportMessageNotification($ticket, $message, $sender);
        if ($sender->isAdmin()) {
            $manager = $ticket->manager;
            if ($manager && $manager->id !== $sender->id) {
                NotificationDispatcher::toUsers([$manager], $notification);
            }
            return;
        }
        // Автор-менеджер — шлём всем админам.
        NotificationDispatcher::toAdmins($notification);
    }

    /** Broadcast обёрнут — падение Reverb не должно ронять http-запрос. */
    private function broadcastSafe(callable $fn): void
    {
        try {
            $fn();
        } catch (Throwable $e) {
            Log::warning('support broadcast failed', ['error' => $e->getMessage()]);
        }
    }
}
