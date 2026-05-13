<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Rent extends Model
{
    use HasFactory, LogsActivity;

    public function activityLabel(): string
    {
        // Lazy-load unit + container, чтобы лейбл нёс полезный контекст:
        // «Аренда кладовки №5 в C-001» вместо безымянного «Аренда #14».
        $unit = $this->unit;
        if ($unit) {
            $label = "кладовки №{$unit->number}";
            $container = $unit->container;
            if ($container && $container->code) {
                $label .= " ({$container->code})";
            }
            return "Аренда {$label}";
        }
        return "Аренда #{$this->id}";
    }

    protected $fillable = [
        'unit_id',
        'date_from',
        'date_to',
        'price',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'date_from' => 'date',
            'date_to' => 'date',
        ];
    }

    // статусы аренды
    const string STATUS_ACTIVE = 'active';
    const string STATUS_FINISHED = 'finished';
    const string STATUS_CANCELLED = 'cancelled';

    public static function getAvailableStatuses(): array
    {
        return [
            self::STATUS_ACTIVE,
            self::STATUS_FINISHED,
            self::STATUS_CANCELLED,
        ];
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }
}
