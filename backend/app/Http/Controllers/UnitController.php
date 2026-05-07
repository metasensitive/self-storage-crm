<?php

namespace App\Http\Controllers;

use App\Http\Requests\Unit\StoreUnitRequest;
use App\Http\Requests\Unit\UpdateUnitRequest;
use App\Models\Unit;
use App\Models\Rent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use App\Http\Resources\UnitResource;

class UnitController extends Controller
{
    /**
     * Список кладовок.
     *
     * Фильтры: container_id, status.
     * Доступ: администратор и менеджер.
     *
     * @tags Кладовки
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'container_id' => ['nullable', 'integer', 'exists:containers,id'],
            'status' => ['nullable', 'string', Rule::in(Unit::getAvailableStatuses())],
        ]);

        $units = Unit::query()
            ->with('container:id,code,location_id')
            ->with('container.location:id,name,city')
            ->withCount(['rents as active_rents_count' => function ($query) {
                $query->where('status', Rent::STATUS_ACTIVE);
            }])
            ->when($validated['container_id'] ?? null, fn($q, $v) => $q->where('container_id', $v))
            ->when($validated['status'] ?? null, fn($q, $v) => $q->where('status', $v))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'data' => UnitResource::collection($units),
            'meta' => [
                'current_page' => $units->currentPage(),
                'last_page' => $units->lastPage(),
                'per_page' => $units->perPage(),
                'total' => $units->total(),
            ]
        ]);
    }

    /**
     * Создание кладовки.
     *
     * Номер должен быть уникальным в рамках контейнера.
     * Доступ: только администратор.
     *
     * @tags Кладовки
     */
    public function store(StoreUnitRequest $request): JsonResponse
    {
        $unit = Unit::create($request->validated());

        Log::info('Кладовка создана', [
            'user_id' => $request->user()->id,
            'unit_id' => $unit->id,
            'container_id' => $unit->container_id,
            'number' => $unit->number,
        ]);

        $unit->load([
            'container:id,code,location_id',
            'container.location:id,name,city',
        ])->loadCount([
            'rents as active_rents_count' => fn($q) => $q->where('status', Rent::STATUS_ACTIVE)
        ]);

        return response()->json([
            'message' => 'Кладовка создана',
            'data' => new UnitResource($unit),
        ], 201);
    }

    /**
     * Просмотр кладовки.
     *
     * Доступ: администратор и менеджер.
     *
     * @tags Кладовки
     */
    public function show(Unit $unit): JsonResponse
    {
        $unit->load([
            'container:id,code,location_id',
            'container.location:id,name,city',
        ])->loadCount([
            'rents as active_rents_count' => fn($q) => $q->where('status', Rent::STATUS_ACTIVE)
        ]);

        return response()->json([
            'data' => new UnitResource($unit),
        ]);
    }

    /**
     * Обновление кладовки.
     *
     * Доступ: только администратор.
     *
     * @tags Кладовки
     */
    public function update(UpdateUnitRequest $request, Unit $unit): JsonResponse
    {
        $unit->update($request->validated());

        Log::info('Кладовка обновлена', [
            'user_id' => $request->user()->id,
            'unit_id' => $unit->id,
        ]);

        $unit->load([
            'container:id,code,location_id',
            'container.location:id,name,city',
        ])->loadCount([
            'rents as active_rents_count' => fn($q) => $q->where('status', Rent::STATUS_ACTIVE)
        ]);

        return response()->json([
            'message' => 'Кладовка обновлена',
            'data' => new UnitResource($unit),
        ]);
    }

    /**
     * Удаление кладовки.
     *
     * Нельзя удалить кладовку с активной арендой.
     * Доступ: только администратор.
     *
     * @tags Кладовки
     */
    public function destroy(Unit $unit): JsonResponse
    {
        if ($unit->rents()->where('status', Rent::STATUS_ACTIVE)->exists()) {
            return response()->json([
                'message' => 'Нельзя удалить кладовку с активной арендой'
            ], 422);
        }

        Log::info('Кладовка удалена', [
            'user_id' => auth()->user()->id,
            'unit_id' => $unit->id,
            'number' => $unit->number,
        ]);

        $unit->delete();

        return response()->json([
            'message' => 'Кладовка удалена'
        ]);
    }

    /**
     * Смена статуса кладовки.
     *
     * Принимает: status (free, reserved, rented, blocked).
     * Доступ: только администратор.
     *
     * @tags Кладовки
     */
    public function updateStatus(Request $request, Unit $unit): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(Unit::getAvailableStatuses())],
        ]);

        $oldStatus = $unit->status;
        $unit->update(['status' => $validated['status']]);

        Log::info('Статус кладовки обновлен', [
            'user_id' => $request->user()->id,
            'unit_id' => $unit->id,
            'old_status' => $oldStatus,
            'new_status' => $validated['status'],
        ]);

        $unit->load([
            'container:id,code,location_id',
            'container.location:id,name,city',
        ])->loadCount([
            'rents as active_rents_count' => fn($q) => $q->where('status', Rent::STATUS_ACTIVE)
        ]);

        return response()->json([
            'message' => 'Статус кладовки обновлен',
            'data' => new UnitResource($unit),
        ]);
    }

    /**
     * Изменение цены кладовки.
     *
     * Принимает: price (число, мин: 0, макс: 99999999.99).
     * Доступ: только администратор.
     *
     * @tags Кладовки
     */
    public function updatePrice(Request $request, Unit $unit): JsonResponse
    {
        $validated = $request->validate([
            'price' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
        ]);

        $oldPrice = $unit->price;
        $unit->update(['price' => $validated['price']]);

        Log::info('Цена кладовки изменена', [
            'user_id' => $request->user()->id,
            'unit_id' => $unit->id,
            'old_price' => $oldPrice,
            'new_price' => $validated['price'],
        ]);

        $unit->load([
            'container:id,code,location_id',
            'container.location:id,name,city',
        ])->loadCount([
            'rents as active_rents_count' => fn($q) => $q->where('status', Rent::STATUS_ACTIVE)
        ]);

        return response()->json([
            'message' => 'Цена кладовки обновлена',
            'data' => new UnitResource($unit),
        ]);
    }
}
