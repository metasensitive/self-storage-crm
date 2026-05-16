<?php

namespace App\Events\Support;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Новое сообщение в конкретном тикете. Канал на сам тикет — подписаны только
 * автор тикета (менеджер) и админы (см. routes/channels.php).
 *
 * Payload минимален — фронт инвалидирует кэш и подтянет сообщение целиком
 * (тот же паттерн, что и у ResourceChanged).
 */
class SupportMessageCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $ticketId,
        public int $messageId,
        public int $authorId,
    ) {
    }

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('support.ticket.' . $this->ticketId);
    }

    public function broadcastAs(): string
    {
        return 'message.created';
    }

    public function broadcastWith(): array
    {
        return [
            'ticket_id' => $this->ticketId,
            'message_id' => $this->messageId,
            'author_id' => $this->authorId,
        ];
    }
}
