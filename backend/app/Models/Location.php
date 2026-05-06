<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Location extends Model
{
    use HasFactory;

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
