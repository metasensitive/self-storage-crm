<?php

namespace App\Events\Support;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * «Менеджер завёл новый тикет поддержки» — слышат только админы.
 * Подписки на этот канал авторизуются ролью admin (см. routes/channels.php).
 */
class SupportTicketCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $ticketId,
        public int $managerId,
    ) {
    }

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('support.admin');
    }

    public function broadcastAs(): string
    {
        return 'ticket.created';
    }

    public function broadcastWith(): array
    {
        return [
            'ticket_id' => $this->ticketId,
            'manager_id' => $this->managerId,
        ];
    }
}
