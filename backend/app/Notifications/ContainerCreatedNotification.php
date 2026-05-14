<?php

namespace App\Notifications;

use App\Models\Container;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ContainerCreatedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Container $container,
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
            'type' => 'container.created',
            'container_id' => $this->container->id,
            'container_code' => $this->container->code,
            'location_name' => $this->container->location?->name,
            'actor_id' => $this->actor->id,
            'actor_name' => $this->actor->name,
        ];
    }
}
