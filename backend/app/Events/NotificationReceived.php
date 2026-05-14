<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * «У пользователя появилось новое in-app уведомление».
 *
 * Раздельный канал на каждого получателя (private-App.Models.User.{id})
 * — авторизация уже есть в channels.php по умолчанию: пользователь видит
 * только свой канал.
 *
 * Сам payload не несёт деталей — фронт инвалидирует список уведомлений
 * и подтянет полный объект с бэка (это упрощает контракт: фронт всегда
 * работает с одной формой данных, не дублирует разбор payload).
 */
class NotificationReceived implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public int $userId)
    {
    }

    public function broadcastOn(): Channel
    {
        return new PrivateChannel('App.Models.User.' . $this->userId);
    }

    public function broadcastAs(): string
    {
        return 'notification.received';
    }

    public function broadcastWith(): array
    {
        return ['user_id' => $this->userId];
    }
}
