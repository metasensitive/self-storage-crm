<?php

namespace App\Services;

use App\Models\Container;
use App\Models\Location;
use App\Models\Rent;
use App\Models\Unit;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    public function network(): array
    {
        $stats = Unit::selectRaw('
        COUNT(*) as total,
        SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as free,
        SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as rented,
        SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as reserved,
        SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as blocked
    ', [
            Unit::STATUS_FREE,
            Unit::STATUS_RENTED,
            Unit::STATUS_RESERVED,
            Unit::STATUS_BLOCKED
        ])->first();

        $total = (int)$stats->total;
        $free = (int)$stats->free;
        $rented = (int)$stats->rented;
        $reserved = (int)$stats->reserved;
        $blocked = (int)$stats->blocked;
        $occupied = $rented + $reserved;

        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

        $monthlyIncome = Rent::whereIn('status', [Rent::STATUS_ACTIVE, Rent::STATUS_FINISHED])
            ->whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->sum('price') ?? 0;

        return [
            'total_units' => $total,
            'free_units' => $free,
            'rented_units' => $rented,
            'reserved_units' => $reserved,
            'blocked_units' => $blocked,
            'occupied_units' => $occupied,
            'occupancy_percent' => $total > 0 ? round(($occupied / $total) * 100, 2) : 0.0,
            'monthly_income' => (float)$monthlyIncome,
        ];
    }

    public function location(int $locationId): ?array
    {
        $location = Location::find($locationId);
        if (!$location) {
            return null;
        }

        $stats = Unit::selectRaw('
        COUNT(*) as total,
        SUM(CASE WHEN units.status = ? THEN 1 ELSE 0 END) as free,
        SUM(CASE WHEN units.status = ? THEN 1 ELSE 0 END) as rented,
        SUM(CASE WHEN units.status = ? THEN 1 ELSE 0 END) as reserved,
        SUM(CASE WHEN units.status = ? THEN 1 ELSE 0 END) as blocked
    ', [
            Unit::STATUS_FREE, Unit::STATUS_RENTED, Unit::STATUS_RESERVED, Unit::STATUS_BLOCKED
        ])
            ->join('containers', 'units.container_id', '=', 'containers.id')
            ->where('containers.location_id', $locationId)
            ->first() ?? (object)['total' => 0, 'free' => 0, 'rented' => 0, 'reserved' => 0, 'blocked' => 0];

        $total = (int)$stats->total;
        $free = (int)$stats->free;
        $rented = (int)$stats->rented;
        $reserved = (int)$stats->reserved;
        $blocked = (int)$stats->blocked;
        $occupied = $rented + $reserved;

        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

        $monthlyIncome = Rent::join('units', 'rents.unit_id', '=', 'units.id')
            ->join('containers', 'units.container_id', '=', 'containers.id')
            ->where('containers.location_id', $locationId)
            ->whereIn('rents.status', [Rent::STATUS_ACTIVE, Rent::STATUS_FINISHED])
            ->whereBetween('rents.created_at', [$startOfMonth, $endOfMonth])
            ->sum('rents.price') ?? 0;

        return [
            'location' => [
                'id' => $location->id,
                'name' => $location->name,
                'city' => $location->city,
            ],
            'total_units' => $total,
            'free_units' => $free,
            'rented_units' => $rented,
            'reserved_units' => $reserved,
            'blocked_units' => $blocked,
            'occupied_units' => $occupied,
            'occupancy_percent' => $total > 0 ? round(($occupied / $total) * 100, 2) : 0.0,
            'monthly_income' => (float)$monthlyIncome,
        ];
    }

    public function container(int $containerId): ?array
    {
        $container = Container::with('location:id,name,city')->find($containerId);
        if (!$container) {
            return null;
        }

        $stats = Unit::selectRaw('
        COUNT(*) as total,
        SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as free,
        SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as rented,
        SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as reserved,
        SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as blocked
    ', [
            Unit::STATUS_FREE, Unit::STATUS_RENTED, Unit::STATUS_RESERVED, Unit::STATUS_BLOCKED
        ])
            ->where('container_id', $containerId)
            ->first();

        $total = (int)($stats->total ?? 0);
        $free = (int)($stats->free ?? 0);
        $rented = (int)($stats->rented ?? 0);
        $reserved = (int)($stats->reserved ?? 0);
        $blocked = (int)($stats->blocked ?? 0);
        $occupied = $rented + $reserved;

        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

        $monthlyIncome = Rent::join('units', 'rents.unit_id', '=', 'units.id')
            ->where('units.container_id', $containerId)
            ->whereIn('rents.status', [Rent::STATUS_ACTIVE, Rent::STATUS_FINISHED])
            ->whereBetween('rents.created_at', [$startOfMonth, $endOfMonth])
            ->sum('rents.price') ?? 0;

        return [
            'container' => [
                'id' => $container->id,
                'code' => $container->code,
                'location' => $container->location ? [
                    'id' => $container->location->id,
                    'name' => $container->location->name,
                    'city' => $container->location->city,
                ] : null,
            ],
            'total_units' => $total,
            'free_units' => $free,
            'rented_units' => $rented,
            'reserved_units' => $reserved,
            'blocked_units' => $blocked,
            'occupied_units' => $occupied,
            'occupancy_percent' => $total > 0 ? round(($occupied / $total) * 100, 2) : 0.0,
            'monthly_income' => (float)$monthlyIncome,
        ];
    }
}
