<?php

namespace App\Notifications;

use App\Models\Unit;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class UnitCreatedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Unit $unit,
        public User $actor,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'unit.created',
            'unit_id' => $this->unit->id,
            'unit_number' => $this->unit->number,
            'container_code' => $this->unit->container?->code,
            'actor_id' => $this->actor->id,
            'actor_name' => $this->actor->name,
        ];
    }
}
