<?php

namespace App\Notifications;

use App\Models\SupportMessage;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Уведомление о новом сообщении в тикете поддержки.
 *
 * Получатели определяются на стороне SupportService:
 *  — если автор-менеджер: рассылка всем админам;
 *  — если автор-админ: точечно владельцу тикета (manager).
 *
 * Реалтайм-пуш делает NotificationReceived (ShouldBroadcastNow) — как и у
 * RentCreatedNotification, через общий NotificationDispatcher.
 */
class SupportMessageNotification extends Notification
{
    use Queueable;

    public function __construct(
        public SupportTicket $ticket,
        public SupportMessage $message,
        public User $sender,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'support.message',
            'ticket_id' => $this->ticket->id,
            'message_id' => $this->message->id,
            'subject' => $this->ticket->subject,
            'sender_id' => $this->sender->id,
            'sender_name' => $this->sender->name,
            'sender_role' => $this->sender->role,
            // Превью без вложений — для строки в колокольчике.
            'preview' => mb_substr((string) $this->message->body, 0, 140),
        ];
    }
}
