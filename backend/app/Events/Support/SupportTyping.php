<?php

namespace App\Events\Support;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * «Пользователь набирает текст в тикете» — эфемерное событие, в БД
 * ничего не пишется, только broadcast по уже существующему каналу тикета.
 *
 * На клиенте композер дебаунсит вызов — шлёт раз в ~3 сек пока юзер
 * набирает. Слушатели держат таймер 5 сек, после которого индикатор
 * гаснет. Полезная нагрузка — кто именно набирает, чтобы UI мог
 * показать «{имя} печатает…» (с маскировкой для менеджера).
 *
 * Канал тот же, что и у обычных событий тикета (`support.ticket.{id}`):
 * подписчики уже там, отдельной авторизации не нужно.
 */
class SupportTyping implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $ticketId,
        public int $userId,
        public string $userName,
        public string $userRole,
    ) {
    }

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('support.ticket.' . $this->ticketId);
    }

    public function broadcastAs(): string
    {
        return 'typing';
    }

    public function broadcastWith(): array
    {
        return [
            'ticket_id' => $this->ticketId,
            'user_id' => $this->userId,
            'user_name' => $this->userName,
            'user_role' => $this->userRole,
        ];
    }
}
