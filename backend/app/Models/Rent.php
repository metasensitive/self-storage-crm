<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Rent extends Model
{
    use HasFactory;

    protected $fillable = [
        'unit_id',
        'date_from',
        'date_to',
        'price',
        'status',
    ];
    protected function casts(): array {
        return [
          'date_from' => 'date',
          'date_to' => 'date',
        ];
    }

    // статусы аренды
    const string STATUS_ACTIVE = 'active';
    const string STATUS_FINISHED = 'finished';
    const string STATUS_CANCELLED = 'cancelled';

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }
}
