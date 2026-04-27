<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Mockery\Container;

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

    public function containers() : HasMany
    {
        return $this->hasMany(Container::class);
    }

    public function getContainersCountAttribute() : int
    {
        return $this->containers()->count();
    }

    public function getUnitsCountAttribute() : int
    {
        return $this->containers()->withCount('units')->get()->sum('units_count');
    }


}
