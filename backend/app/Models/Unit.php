<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Unit extends Model
{
    use HasFactory, LogsActivity;

    public function activityLabel(): string
    {
        $base = $this->number ? "Кладовка №{$this->number}" : "Кладовка #{$this->id}";
        $container = $this->container;
        if ($container && $container->code) {
            return "{$base} в {$container->code}";
        }
        return $base;
    }

    protected $fillable = [
        'container_id',
        'number',
        'size',
        'price',
        'status',
    ];

    // статусы кладовок
    const string STATUS_FREE = 'free';
    const string STATUS_RESERVED = 'reserved';
    const string STATUS_RENTED = 'rented';
    const string STATUS_BLOCKED = 'blocked';

    public static function getAvailableStatuses(): array
    {
        return [
            self::STATUS_FREE,
            self::STATUS_RESERVED,
            self::STATUS_RENTED,
            self::STATUS_BLOCKED,
        ];
    }

    public function container() : BelongsTo
    {
        return $this->belongsTo(Container::class);
    }
    public function rents() : HasMany
    {
        return $this->hasMany(Rent::class);
    }
    public function activeRent(): ?Rent
    {
        /** @var ?Rent */
        return $this->rents()
            ->where('status', Rent::STATUS_ACTIVE)
            ->latest('date_from')
            ->first();
    }
    public function isAvailable() : bool
    {
        return $this->status === self::STATUS_FREE && !$this->activeRent();
    }
}
