<?php

namespace App\Http\Controllers;

use App\Http\Requests\Location\StoreLocationRequest;
use App\Http\Requests\Location\UpdateLocationRequest;
use App\Models\Location;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use App\Http\Resources\LocationResource;

class LocationController extends Controller
{
    /**
     * Список локаций.
     *
     * С агрегацией: количество контейнеров и кладовок.
     * Доступ: администратор и менеджер.
     *
     * @tags Локации
     */
    public function index(): JsonResponse
    {
        $locations = Location::query()
            ->withCount('containers')
            ->withSum('units', 'size')
            ->withCount(['units as units_count'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'data' => LocationResource::collection($locations),
            'meta' => [
                'current_page' => $locations->currentPage(),
                'last_page' => $locations->lastPage(),
                'per_page' => $locations->perPage(),
                'total' => $locations->total(),
            ]
        ]);
    }

    /**
     * Создание локации.
     *
     * Доступ: только администратор.
     *
     * @tags Локации
     */
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
            'data' => new LocationResource($location),
        ], 201);
    }

    /**
     * Просмотр локации.
     *
     * Доступ: администратор и менеджер.
     *
     * @tags Локации
     */
    public function show(Location $location): JsonResponse
    {
        return response()->json([
            'data' => new LocationResource($location),
        ]);
    }

    /**
     * Обновление локации.
     *
     * Доступ: только администратор.
     *
     * @tags Локации
     */
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
            'data' => new LocationResource($location),
        ]);
    }

    /**
     * Удаление локации.
     *
     * Нельзя удалить локацию, в которой есть контейнеры.
     * Доступ: только администратор.
     *
     * @tags Локации
     */
    public function destroy(Location $location): JsonResponse
    {
        if ($location->containers()->exists()) {
            return response()->json([
                'message' => 'Нельзя удалить локацию, в которой есть контейнеры'
            ], 422);
        }

        Log::info('Локация удалена', [
            'user_id' => auth()->user()->id,
            'location_id' => $location->id,
            'name' => $location->name
        ]);

        $location->delete();

        return response()->json([
            'message' => 'Локация удалена'
        ]);
    }
}
