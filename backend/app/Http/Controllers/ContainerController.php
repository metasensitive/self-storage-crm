<?php

namespace App\Http\Controllers;

use App\Http\Requests\Container\StoreContainerRequest;
use App\Http\Requests\Container\UpdateContainerRequest;
use App\Models\Container;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Http\Resources\ContainerResource;

class ContainerController extends Controller
{
    /**
     * Список контейнеров.
     *
     * Фильтры: location_id, status.
     * Доступ: администратор и менеджер.
     *
     * @tags Контейнеры
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'location_id' => ['nullable', 'integer', 'exists:locations,id'],
            'status' => ['nullable', 'string', Rule::in(Container::getAvailableStatuses())],
        ]);

        $containers = Container::query()
            ->with('location:id,name,city')
            ->withCount('units')
            ->when(request('location_id'), fn($q) => $q->where('location_id', request('location_id')))
            ->when(request('status'), fn($q) => $q->where('status', request('status')))
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'data' => ContainerResource::collection($containers),
            'meta' => [
                'current_page' => $containers->currentPage(),
                'last_page' => $containers->lastPage(),
                'per_page' => $containers->perPage(),
                'total' => $containers->total(),
            ]
        ]);
    }

    /**
     * Создание контейнера.
     *
     * Доступ: только администратор.
     *
     * @tags Контейнеры
     */
    public function store(StoreContainerRequest $request): JsonResponse
    {
        $data = $request->validated();

        // Если код не передан с клиента — генерируем следующий по шаблону «C-NNN».
        if (empty($data['code'])) {
            $data['code'] = $this->generateNextCode();
        }

        $container = Container::create($data);

        Log::info('Контейнер создан', [
            'user_id' => $request->user()->id,
            'container_id' => $container->id,
            'code' => $container->code,
        ]);

        $container->load('location:id,name,city')->loadCount('units');

        return response()->json([
            'message' => 'Контейнер создан',
            'data' => new ContainerResource($container),
        ], 201);
    }

    /**
     * Возвращает следующий свободный код контейнера в формате «C-NNN»
     * (минимум 3 цифры с ведущими нулями). При коллизии — увеличивает счётчик
     * до свободного значения.
     */
    private function generateNextCode(): string
    {
        $maxSuffix = Container::where('code', 'like', 'C-%')
            ->pluck('code')
            ->map(fn ($c) => (int) substr((string) $c, 2))
            ->filter()
            ->max() ?? 0;

        $next = $maxSuffix + 1;
        do {
            $code = 'C-' . str_pad((string) $next, 3, '0', STR_PAD_LEFT);
            $next++;
        } while (Container::where('code', $code)->exists());

        return $code;
    }

    /**
     * Просмотр контейнера.
     *
     * Доступ: администратор и менеджер.
     *
     * @tags Контейнеры
     */
    public function show(Container $container): JsonResponse
    {
        $container->load('location:id,name,city')->loadCount('units');

        return response()->json([
            'data' => new ContainerResource($container),
        ]);
    }

    /**
     * Обновление контейнера.
     *
     * Доступ: только администратор.
     *
     * @tags Контейнеры
     */
    public function update(UpdateContainerRequest $request, Container $container): JsonResponse
    {
        $container->update($request->validated());

        Log::info('Контейнер обновлен', [
            'user_id' => $request->user()->id,
            'container_id' => $container->id,
        ]);

        $container->load('location:id,name,city')->loadCount('units');

        return response()->json([
            'message' => 'Контейнер обновлен',
            'data' => new ContainerResource($container),
        ]);
    }

    /**
     * Удаление контейнера.
     *
     * Нельзя удалить контейнер, в котором есть кладовки.
     * Доступ: только администратор.
     *
     * @tags Контейнеры
     */
    public function destroy(Container $container): JsonResponse
    {
        if ($container->units()->exists()) {
            return response()->json([
                'message' => 'Нельзя удалить контейнер, в котором есть кладовки'
            ], 422);
        }

        Log::info('Контейнер удален', [
            'user_id' => auth()->user()->id,
            'container_id' => $container->id,
            'code' => $container->code,
        ]);

        $container->delete();

        return response()->json([
            'message' => 'Контейнер удален'
        ]);
    }

    /**
     * Смена статуса контейнера.
     *
     * Принимает: status (active, inactive, maintenance).
     * Доступ: только администратор.
     *
     * @tags Контейнеры
     */
    public function updateStatus(Request $request, Container $container): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', Rule::in(Container::getAvailableStatuses())],
        ]);

        $oldStatus = $container->status;
        $container->update(['status' => $validated['status']]);

        Log::info('Статус контейнера обновлен', [
            'user_id' => $request->user()->id,
            'container_id' => $container->id,
            'old_status' => $oldStatus,
            'new_status' => $validated['status'],
        ]);

        $container->load('location:id,name,city')->loadCount('units');

        return response()->json([
            'message' => 'Статус контейнера обновлен',
            'data' => new ContainerResource($container),
        ], 200);
    }

    /**
     * Массовая смена статуса контейнеров.
     *
     * @tags Контейнеры
     */
    public function bulkUpdateStatus(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:200'],
            'ids.*' => ['integer', 'distinct', 'exists:containers,id'],
            'status' => ['required', 'string', Rule::in(Container::getAvailableStatuses())],
        ]);

        // Per-model update — чтобы сработали события и trait LogsActivity
        // записал каждую смену статуса в аудит-лог.
        $count = 0;
        Container::query()->whereIn('id', $data['ids'])->get()->each(function (Container $c) use ($data, &$count) {
            if ($c->status !== $data['status']) {
                $c->update(['status' => $data['status']]);
                $count++;
            }
        });

        return response()->json([
            'message' => "Обновлено: {$count}",
            'data' => ['updated_count' => $count],
        ]);
    }

    /**
     * Массовое удаление контейнеров.
     *
     * Контейнеры с кладовками пропускаются и возвращаются в `skipped`.
     *
     * @tags Контейнеры
     */
    public function bulkDestroy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:200'],
            'ids.*' => ['integer', 'distinct', 'exists:containers,id'],
        ]);

        $containers = Container::query()
            ->whereIn('id', $data['ids'])
            ->withCount('units')
            ->get();

        $skipped = [];
        $deletable = [];
        foreach ($containers as $container) {
            if ($container->units_count > 0) {
                $skipped[] = [
                    'id' => $container->id,
                    'reason' => 'В контейнере есть кладовки',
                ];
            } else {
                $deletable[] = $container;
            }
        }

        $deletedCount = 0;
        foreach ($deletable as $container) {
            $container->delete();
            $deletedCount++;
        }

        return response()->json([
            'message' => "Удалено: {$deletedCount}, пропущено: " . count($skipped),
            'data' => [
                'deleted_count' => $deletedCount,
                'skipped' => $skipped,
            ],
        ]);
    }
}
