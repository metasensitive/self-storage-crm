<?php

namespace App\Services;

use App\Events\NotificationReceived;
use App\Models\User;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification as NotificationFacade;
use Throwable;

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
        self::send($recipients, $notification);
    }

    /**
     * Адресная рассылка — список конкретных пользователей. Применяется в чате
     * поддержки: менеджер пишет → шлём всем админам; админ отвечает →
     * шлём только владельцу тикета.
     *
     * @param iterable<User> $users
     */
    public static function toUsers(iterable $users, Notification $notification): void
    {
        $collection = collect($users)->filter()->unique('id')->values();
        self::send($collection, $notification);
    }

    /** Только админам. */
    public static function toAdmins(Notification $notification): void
    {
        $recipients = User::query()->where('role', User::ROLE_ADMIN)->get();
        self::send($recipients, $notification);
    }

    /**
     * Общая отправка: пишет в БД через database channel + бросает
     * NotificationReceived через terminating-callback на каждый канал
     * получателя.
     *
     * Запись в БД остаётся синхронной — это быстро (один INSERT на user'а
     * с одним общим payload'ом), и нужно чтобы /notifications GET сразу
     * после POST'а уже содержал свежие записи.
     *
     * А вот broadcast'ы откладываем в `app()->terminating()`: цикл из N
     * push'ов в WebSocket выполнится ПОСЛЕ того, как Laravel отдал http-
     * ответ. Раньше N синхронных broadcast'ов в request-cycle давали
     * N × 200-500 ms задержки на чате при рассылке всем админам.
     */
    private static function send($recipients, Notification $notification): void
    {
        if ($recipients->isEmpty()) {
            return;
        }
        NotificationFacade::send($recipients, $notification);

        // Списываем id'ы заранее — collection переживёт terminating-callback,
        // но не хочется тащить туда полные user-модели и связанные данные.
        $userIds = collect($recipients)->pluck('id')->all();
        try {
            app()->terminating(function () use ($userIds) {
                foreach ($userIds as $userId) {
                    try {
                        broadcast(new NotificationReceived($userId));
                    } catch (Throwable $e) {
                        Log::warning('broadcast NotificationReceived failed', [
                            'user_id' => $userId,
                            'error' => $e->getMessage(),
                        ]);
                    }
                }
            });
        } catch (Throwable $e) {
            Log::warning('NotificationDispatcher afterResponse register failed', [
                'error' => $e->getMessage(),
            ]);
        }
    }
}
