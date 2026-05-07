<?php

namespace App\Http\Controllers;

use App\Http\Requests\Container\StoreContainerRequest;
use App\Http\Requests\Container\UpdateContainerRequest;
use App\Models\Container;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ContainerController extends Controller
{
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
            'data' => $containers->map(fn($container) => $this->formatContainer($container)),
            'meta' => [
                'current_page' => $containers->currentPage(),
                'last_page' => $containers->lastPage(),
                'per_page' => $containers->perPage(),
                'total' => $containers->total(),
            ]
        ]);
    }

    public function store(StoreContainerRequest $request): JsonResponse
    {
        $container = Container::create($request->validated());

        Log::info('Контейнер создан', [
            'user_id' => $request->user()->id,
            'container_id' => $container->id,
            'code' => $container->code,
        ]);

        $container->load('location:id,name,city')->loadCount('units');

        return response()->json([
            'message' => 'Контейнер создан',
            'data' => $this->formatContainer($container),
        ], 201);
    }

    public function show(Container $container): JsonResponse
    {
        $container->load('location:id,name,city')->loadCount('units');

        return response()->json([
            'data' => $this->formatContainer($container),
        ]);
    }

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
            'data' => $this->formatContainer($container),
        ]);
    }

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
            'data' => $this->formatContainer($container),
        ], 200);
    }

    private function formatContainer(Container $container): array
    {
        return [
            'id' => $container->id,
            'code' => $container->code,
            'units_count' => (int)$container->units_count,
            'status' => $container->status,
            'installed_at' => $container->installed_at?->toISOString(),
            'location' => $container->location?->only(['id', 'name', 'city']),
            'created_at' => $container->created_at?->toISOString(),
            'updated_at' => $container->updated_at?->toISOString(),
        ];
    }
}
