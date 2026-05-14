<?php

namespace App\Events;

use App\Models\ActivityLog;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Событие «появилась новая запись в журнале действий». Отдельный
 * приватный канал только для админа — журнал доступен только им.
 *
 * Сам payload не несёт detals — фронт инвалидирует react-query и
 * перезапросит первую страницу (новые записи приходят туда).
 */
class ActivityLogCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public int $logId)
    {
    }

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('admin.activity');
    }

    public function broadcastAs(): string
    {
        return 'log.created';
    }

    public function broadcastWith(): array
    {
        return ['id' => $this->logId];
    }
}
