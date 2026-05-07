<?php

namespace App\Http\Controllers;

use App\Http\Requests\Location\StoreLocationRequest;
use App\Http\Requests\Location\UpdateLocationRequest;
use App\Models\Location;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class LocationController extends Controller
{
    public function index(): JsonResponse
    {
        $locations = Location::query()
            ->withCount('containers')
            ->withSum('units', 'size')
            ->withCount(['units as units_count'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'data' => $locations->map(fn($location) => $this->formatLocation($location)),
            'meta' => [
                'current_page' => $locations->currentPage(),
                'last_page' => $locations->lastPage(),
                'per_page' => $locations->perPage(),
                'total' => $locations->total(),
            ]
        ]);
    }

    public function store(StoreLocationRequest $request): JsonResponse
    {
        $location = Location::create($request->validated());

        Log::info('Локация создана', [
            'user_id' => $request->user()->id,
            'location_id' => $location->id,
            'name' => $location->name
        ]);

        return response()->json([
            'message' => 'Локация создана',
            'data' => $this->formatLocation($location)
        ], 201);
    }

    public function show(Location $location): JsonResponse
    {
        return response()->json([
            'data' => $this->formatLocation($location)
        ]);
    }

    public function update(UpdateLocationRequest $request, Location $location): JsonResponse
    {
        $location->update($request->validated());
        $location->loadCount(['containers', 'units as units_count']);

        Log::info('Локация обновлена', [
            'user_id' => $request->user()->id,
            'location_id' => $location->id,
        ]);

        return response()->json([
            'message' => 'Локация обновлена',
            'data' => $this->formatLocation($location->fresh())
        ]);
    }

    public function destroy(Location $location): JsonResponse
    {
        if ($location->containers()->exists()) {
            return response()->json([
                'message' => 'Нельзя удалить локацию, в которой есть контейнеры'
            ], 422);
        }

        Log::info('Локация удалена', [
            'user_id' => request()->user()->id,
            'location_id' => $location->id,
            'name' => $location->name
        ]);

        $location->delete();

        return response()->json([
            'message' => 'Локация удалена'
        ]);
    }

    private function formatLocation(Location $location): array
    {
        return [
            'id' => $location->id,
            'name' => $location->name,
            'city' => $location->city,
            'address' => $location->address,
            'latitude' => $location->latitude !== null ? (float) $location->latitude : null,
            'longitude' => $location->longitude !== null ? (float) $location->longitude : null,
            'status' => $location->status,
            'containers_count' => (int) ($location->containers_count ?? 0),
            'units_count' => (int) ($location->units_count ?? 0),
            'created_at' => $location->created_at?->toISOString(),
            'updated_at' => $location->updated_at?->toISOString(),
        ];
    }
}
