<?php

namespace App\Notifications;

use App\Models\Location;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class LocationCreatedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Location $location,
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
            'type' => 'location.created',
            'location_id' => $this->location->id,
            'location_name' => $this->location->name,
            'city' => $this->location->city,
            'actor_id' => $this->actor->id,
            'actor_name' => $this->actor->name,
        ];
    }
}
