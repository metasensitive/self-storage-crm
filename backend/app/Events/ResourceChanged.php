<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Лёгкое событие об изменении доменной сущности (locations / containers /
 * units / rents). Несёт только тип и id — фронт инвалидирует свой кэш
 * react-query соответствующих ключей и подтянет свежие данные сам.
 *
 * Деталей объекта в payload намеренно нет: (а) проще авторизация — не нужно
 * отдельных каналов на роли, (б) фронт всё равно делает фетч с учётом своих
 * фильтров.
 */
class ResourceChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $resource, // location | container | unit | rent
        public int $id,
        public string $action,   // created | updated | deleted
    ) {
    }

    public function broadcastOn(): Channel
    {
        // Любой авторизованный пользователь может слушать — события касаются
        // всех ролей (admin и manager работают с теми же данными).
        return new PrivateChannel('app.changes');
    }

    /** Имя события в WebSocket — фронту удобнее короткое. */
    public function broadcastAs(): string
    {
        return 'resource.changed';
    }

    /** Полезная нагрузка для клиента. */
    public function broadcastWith(): array
    {
        return [
            'resource' => $this->resource,
            'id' => $this->id,
            'action' => $this->action,
        ];
    }
}
