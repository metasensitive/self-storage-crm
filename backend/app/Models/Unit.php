<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Unit extends Model
{
    use HasFactory;

    protected $fillable = [
        'container_id',
        'number',
        'size',
        'price',
        'status',
    ];

    // статусы кладовок
    const STATUS_FREE = 'free';
    const STATUS_RESERVED = 'reserved';
    const STATUS_RENTED = 'rented';
    const STATUS_BLOCKED = 'blocked';

    public function container() : BelongsTo
    {
        return $this->belongsTo(Container::class);
    }
    public function rents() : HasMany
    {
        return $this->hasMany(Rent::class);
    }
    public function activeRent() : ?Rent
    {
        return $this->rents()->where('status', 'active')->latest()->first();
    }
    public function isAvailable() : bool
    {
        return $this->status === self::STATUS_FREE && !$this->activeRent();
    }
}
