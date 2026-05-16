<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportAttachment extends Model
{
    protected $fillable = [
        'message_id',
        'disk',
        'path',
        'original_name',
        'mime',
        'size_bytes',
    ];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
        ];
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(SupportMessage::class, 'message_id');
    }

    public function isImage(): bool
    {
        return str_starts_with($this->mime, 'image/');
    }
}
