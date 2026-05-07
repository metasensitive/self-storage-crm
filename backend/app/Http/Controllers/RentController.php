<?php

namespace App\Http\Controllers;

use App\Http\Requests\Rent\StoreRentRequest;
use App\Models\Rent;
use App\Services\RentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Illuminate\Validation\Rule;

class RentController extends Controller
{
    private RentService $rentService;

    public function __construct(RentService $rentService)
    {
        $this->rentService = $rentService;
    }

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
            'data' => $rents->map(fn($rent) => $this->formatRent($rent)),
            'meta' => [
                'current_page' => $rents->currentPage(),
                'last_page' => $rents->lastPage(),
                'per_page' => $rents->perPage(),
                'total' => $rents->total(),
            ]
        ]);
    }

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

        return response()->json([
            'message' => 'Аренда создана',
            'data' => $this->formatRent($rent),
        ], 201);
    }

    public function show(Rent $rent): JsonResponse
    {
        $rent->load([
            'unit:id,number,container_id',
            'unit.container:id,code,location_id',
            'unit.container.location:id,name,city',
        ]);

        return response()->json([
            'data' => $this->formatRent($rent),
        ]);
    }

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
            'data' => $this->formatRent($rent),
        ]);
    }

    public function formatRent(Rent $rent): array
    {
        $unit = $rent->unit;
        $container = $unit?->container;
        $location = $container?->location;

        return [
            'id' => $rent->id,
            'unit' => $unit ? [
                'id' => $unit->id,
                'number' => $unit->number,
                'container' => $container ? [
                    'id' => $container->id,
                    'code' => $container->code,
                    'location' => $location ? [
                        'id' => $location->id,
                        'name' => $location->name,
                        'city' => $location->city,
                    ] : null,
                ] : null,
            ] : null,
            'date_from' => $rent->date_from?->toDateString(),
            'date_to' => $rent->date_to?->toDateString(),
            'price' => (float)($rent->price ?? 0),
            'status' => $rent->status,
            'created_at' => $rent->created_at?->toISOString(),
            'updated_at' => $rent->updated_at?->toISOString(),
        ];
    }
}
