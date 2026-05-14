<?php

namespace App\Services;

use App\Events\NotificationReceived;
use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Notification as NotificationFacade;

/**
 * Тонкий helper для рассылки in-app уведомлений всем сотрудникам.
 *
 * - Записывает в БД через database channel (для каждого user'а — своя строка).
 * - Дополнительно пушит `NotificationReceived` (ShouldBroadcastNow) на личный
 *   канал каждого получателя — это даёт мгновенный update колокольчика.
 *
 * Создатель действия включён в рассылку: это его собственная история,
 * особенно важно для менеджеров (у них нет доступа к аудит-логу).
 */
class NotificationDispatcher
{
    public static function toAllStaff(Notification $notification): void
    {
        $recipients = User::query()->get();
        if ($recipients->isEmpty()) {
            return;
        }
        NotificationFacade::send($recipients, $notification);
        foreach ($recipients as $user) {
            broadcast(new NotificationReceived($user->id));
        }
    }
}
