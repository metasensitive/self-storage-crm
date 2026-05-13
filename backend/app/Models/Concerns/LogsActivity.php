<?php

namespace App\Models\Concerns;

use App\Models\ActivityLog;
use Illuminate\Database\Eloquent\Model;

/**
 * Подмешивает модели запись в `activity_logs` на eloquent-события
 * `created` / `updated` / `deleted`. Сам ActivityLog НЕ должен использовать
 * этот trait — иначе будет рекурсия записей при логировании логов.
 */
trait LogsActivity
{
    /** Атрибуты, которые никогда не должны попадать в `changes`. */
    protected static array $activityExcludedAttributes = [
        'password',
        'remember_token',
        'updated_at',
        'created_at',
    ];

    public static function bootLogsActivity(): void
    {
        static::created(fn (Model $m) => static::recordActivity($m, 'created'));
        static::updated(fn (Model $m) => static::recordActivity($m, 'updated'));
        static::deleted(fn (Model $m) => static::recordActivity($m, 'deleted'));
    }

    protected static function recordActivity(Model $model, string $action): void
    {
        // Сидеры, артизан-команды, фабрики в тестах — пишут без auth.
        // Чтобы лог не засорялся служебными записями, в консоли пишем только
        // когда явно есть аутентифицированный пользователь (т.е. это http-тест).
        if (app()->runningInConsole() && ! auth()->check()) {
            return;
        }

        $changes = static::buildChanges($model, $action);
        if ($action === 'updated' && empty($changes['new'] ?? [])) {
            // менялся только updated_at / технические поля — мусор, не пишем
            return;
        }

        $request = request();
        ActivityLog::create([
            'user_id' => auth()->id(),
            'action' => $action,
            'subject_type' => get_class($model),
            'subject_id' => $model->getKey(),
            'subject_label' => method_exists($model, 'activityLabel')
                ? (string) $model->activityLabel()
                : (string) $model->getKey(),
            'changes' => $changes,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'created_at' => now(),
        ]);
    }

    protected static function buildChanges(Model $model, string $action): ?array
    {
        $strip = fn (array $a) => array_diff_key($a, array_flip(static::$activityExcludedAttributes));

        return match ($action) {
            'created' => ['new' => $strip($model->getAttributes())],
            'updated' => (function () use ($model, $strip) {
                $dirty = $strip($model->getChanges());
                if (empty($dirty)) {
                    return ['new' => []];
                }
                $old = array_intersect_key($model->getOriginal(), $dirty);
                return ['old' => $strip($old), 'new' => $dirty];
            })(),
            'deleted' => ['old' => $strip($model->getOriginal())],
            default => null,
        };
    }
}
