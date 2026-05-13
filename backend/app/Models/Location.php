<?php

namespace App\Models;

use App\Models\Concerns\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Location extends Model
{
    use HasFactory, LogsActivity;

    public function activityLabel(): string
    {
        return $this->name ?? (string) $this->id;
    }

    protected $fillable = [
        'name',
        'city',
        'address',
        'latitude',
        'longitude',
        'status',
    ];

    public function containers(): HasMany
    {
        return $this->hasMany(Container::class);
    }

    public function units(): HasManyThrough
    {
        return $this->hasManyThrough(
            Unit::class,
            Container::class,
            'location_id',
            'container_id',
            'id',
            'id'
        );
    }

    public function getContainersCountAttribute(): int
    {
        return $this->containers()->count();
    }

    public function getUnitsCountAttribute(): int
    {
        return $this->containers()->sum('units_count');
    }
}
