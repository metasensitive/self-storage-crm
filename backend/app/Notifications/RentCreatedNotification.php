<?php

namespace App\Notifications;

use App\Models\Rent;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

/**
 * Уведомление «новая аренда» — рассылается всем сотрудникам, кроме того,
 * кто её создал. Хранится в БД через стандартный database-channel, чтобы
 * фронт мог поднимать историю + считать unread.
 *
 * Реалтайм-пуш делает отдельное событие `NotificationReceived`
 * (ShouldBroadcastNow) — broadcast-channel самого Laravel queue'ится
 * через jobs-таблицу, что не подходит для мгновенных уведомлений.
 */
class RentCreatedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Rent $rent,
        public User $actor,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $unit = $this->rent->unit;
        $container = $unit?->container;
        return [
            'type' => 'rent.created',
            'rent_id' => $this->rent->id,
            'unit_number' => $unit?->number,
            'container_code' => $container?->code,
            'actor_id' => $this->actor->id,
            'actor_name' => $this->actor->name,
            'price' => $this->rent->price,
        ];
    }
}
