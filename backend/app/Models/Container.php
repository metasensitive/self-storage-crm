<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Container extends Model
{
    use HasFactory, LogsActivity;

    public function activityLabel(): string
    {
        return $this->code ?? (string) $this->id;
    }

    const string STATUS_ACTIVE = 'active';
    const string STATUS_INACTIVE = 'inactive';
    const string STATUS_MAINTENANCE = 'maintenance';

    protected $fillable = [
        'location_id',
        'code',
        'units_count',
        'status',
        'installed_at',
    ];

    public static function getAvailableStatuses(): array
    {
        return [
            self::STATUS_ACTIVE,
            self::STATUS_INACTIVE,
            self::STATUS_MAINTENANCE,
        ];
    }

    protected function casts(): array {
        return [
          'installed_at' => 'date',
        ];
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function units(): HasMany
    {
        return $this->hasMany(Unit::class);
    }
}
