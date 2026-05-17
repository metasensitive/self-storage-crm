<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupportMessage extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'ticket_id',
        'author_id',
        'type',
        'body',
        'edited_at',
    ];

    const string TYPE_MESSAGE = 'message';
    const string TYPE_SYSTEM_CLOSED = 'system_closed';
    const string TYPE_SYSTEM_REOPENED = 'system_reopened';

    public function isSystem(): bool
    {
        return str_starts_with($this->type ?? '', 'system_');
    }

    protected function casts(): array
    {
        return [
            'edited_at' => 'datetime',
        ];
    }

    public function ticket(): BelongsTo
    {
        return $this->belongsTo(SupportTicket::class, 'ticket_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(SupportAttachment::class, 'message_id');
    }

    public function reads(): HasMany
    {
        return $this->hasMany(SupportMessageRead::class, 'message_id');
    }

    /**
     * В пределах окна редактирования (config('support.edit_window_minutes'))
     * — автор может править/удалять своё сообщение. После окна — нет.
     */
    public function isWithinEditWindow(): bool
    {
        $minutes = (int) config('support.edit_window_minutes', 10);
        return $this->created_at && $this->created_at->gt(now()->subMinutes($minutes));
    }
}
