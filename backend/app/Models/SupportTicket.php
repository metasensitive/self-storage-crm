<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class SupportTicket extends Model
{
    protected $fillable = [
        'manager_id',
        'subject',
        'status',
        'last_message_at',
        'last_message_preview',
        'closed_at',
        'closed_by',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    const string STATUS_OPEN = 'open';
    const string STATUS_CLOSED = 'closed';

    public static function getAvailableStatuses(): array
    {
        return [self::STATUS_OPEN, self::STATUS_CLOSED];
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(SupportMessage::class, 'ticket_id');
    }

    public function lastMessage(): HasOne
    {
        return $this->hasOne(SupportMessage::class, 'ticket_id')->latestOfMany();
    }

    /**
     * Тикеты, к которым у пользователя есть доступ: админ — ко всем,
     * менеджер — только к своим.
     */
    public function scopeVisibleTo(Builder $q, User $user): Builder
    {
        if ($user->isAdmin()) {
            return $q;
        }
        return $q->where('manager_id', $user->id);
    }

    /**
     * Сколько непрочитанных сообщений у тикета для конкретного пользователя.
     * Не считаем свои сообщения и удалённые.
     */
    public function unreadCountFor(User $user): int
    {
        return $this->messages()
            ->where('author_id', '!=', $user->id)
            ->whereNull('deleted_at')
            ->whereNotIn('id', function ($sub) use ($user) {
                $sub->select('message_id')
                    ->from('support_message_reads')
                    ->where('user_id', $user->id);
            })
            ->count();
    }

    public function isClosed(): bool
    {
        return $this->status === self::STATUS_CLOSED;
    }
}
