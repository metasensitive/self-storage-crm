<?php

namespace App\Http\Controllers;

use App\Events\NotificationReceived;
use App\Http\Requests\Rent\StoreRentRequest;
use App\Models\Rent;
use App\Models\User;
use App\Notifications\RentCreatedNotification;
use App\Services\RentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use InvalidArgumentException;
use Illuminate\Validation\Rule;
use App\Http\Resources\RentResource;

class RentController extends Controller
{
    private RentService $rentService;

    public function __construct(RentService $rentService)
    {
        $this->rentService = $rentService;
    }

    /**
     * Список аренд.
     *
     * Фильтры: status, unit_id, location_id.
     * Доступ: администратор и менеджер.
     *
     * @tags Аренды
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', Rule::in(Rent::getAvailableStatuses())],
            'unit_id' => ['nullable', 'integer', 'exists:units,id'],
            'location_id' => ['nullable', 'integer', 'exists:locations,id'],
        ]);

        $rents = Rent::query()
            ->with([
                'unit:id,number,container_id',
                'unit.container:id,code,location_id',
                'unit.container.location:id,name,city',
            ])
            ->when($validated['status'] ?? null, fn($q, $v) => $q->where('status', $v))
            ->when($validated['unit_id'] ?? null, fn($q, $v) => $q->where('unit_id', $v))
            ->when($validated['location_id'] ?? null, function ($q, $v) {
                $q->whereHas('unit.container', fn($sq) => $sq->where('location_id', $v));
            })
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'data' => RentResource::collection($rents),
            'meta' => [
                'current_page' => $rents->currentPage(),
                'last_page' => $rents->lastPage(),
                'per_page' => $rents->perPage(),
                'total' => $rents->total(),
            ]
        ]);
    }

    /**
     * Создание аренды.
     *
     * Кладовка должна быть свободна. Минимальный срок — 10 дней.
     * Цена рассчитывается автоматически: цена_кладовки × количество_дней.
     * Доступ: администратор и менеджер.
     *
     * @tags Аренды
     */
    public function store(StoreRentRequest $request): JsonResponse
    {
        try {
            $rent = $this->rentService->createRent(
                $request->validated(),
                $request->user()->id
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $rent->load([
            'unit:id,number,container_id',
            'unit.container:id,code,location_id',
            'unit.container.location:id,name,city',
        ]);

        // Рассылаем уведомление всем сотрудникам кроме создателя.
        // Database channel → запись в notifications. Дополнительно дёргаем
        // ShouldBroadcastNow-событие на private-канале получателя — фронт
        // моментально подтянет свежий список и пересчитает unread.
        $actor = $request->user();
        $recipients = User::query()->where('id', '!=', $actor->id)->get();
        if ($recipients->isNotEmpty()) {
            Notification::send($recipients, new RentCreatedNotification($rent, $actor));
            foreach ($recipients as $user) {
                broadcast(new NotificationReceived($user->id));
            }
        }

        return response()->json([
            'message' => 'Аренда создана',
            'data' => new RentResource($rent),
        ], 201);
    }

    /**
     * Просмотр аренды.
     *
     * Доступ: администратор и менеджер.
     *
     * @tags Аренды
     */
    public function show(Rent $rent): JsonResponse
    {
        $rent->load([
            'unit:id,number,container_id',
            'unit.container:id,code,location_id',
            'unit.container.location:id,name,city',
        ]);

        return response()->json([
            'data' => new RentResource($rent),
        ]);
    }

    /**
     * Завершение аренды.
     *
     * Освобождает кладовку (статус → free).
     * Нельзя завершить уже завершённую аренду.
     * Доступ: администратор и менеджер.
     *
     * @tags Аренды
     */
    public function finishRent(Rent $rent): JsonResponse
    {
        try {
            $rent = $this->rentService->finishRent($rent, auth()->user()->id);
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $rent->load([
            'unit:id,number,container_id',
            'unit.container:id,code,location_id',
            'unit.container.location:id,name,city',
        ]);

        return response()->json([
            'message' => 'Аренда завершена',
            'data' => new RentResource($rent),
        ]);
    }
}
