<?php

namespace App\Events\Support;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Универсальное событие изменений по тикету: status / read / edited / deleted.
 * Фронт по kind решает, какой queryKey инвалидировать.
 */
class SupportTicketUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $ticketId,
        public string $kind, // status | read | edited | deleted
    ) {
    }

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('support.ticket.' . $this->ticketId);
    }

    public function broadcastAs(): string
    {
        return 'ticket.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'ticket_id' => $this->ticketId,
            'kind' => $this->kind,
        ];
    }
}
