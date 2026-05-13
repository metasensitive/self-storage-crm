<?php

namespace App\Http\Controllers;

use App\Http\Resources\ActivityLogResource;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    /** Соответствие короткого имени → FQCN модели, используем в фильтре. */
    private const SUBJECT_TYPE_MAP = [
        'Location' => \App\Models\Location::class,
        'Container' => \App\Models\Container::class,
        'Unit' => \App\Models\Unit::class,
        'Rent' => \App\Models\Rent::class,
        'User' => \App\Models\User::class,
    ];

    /**
     * Журнал действий пользователей в системе.
     *
     * Поддерживает фильтрацию по типу объекта, типу действия, пользователю и
     * периоду. Только для администратора.
     *
     * @tags Аудит
     */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'subject_type' => ['nullable', 'string', 'in:' . implode(',', array_keys(self::SUBJECT_TYPE_MAP))],
            'action' => ['nullable', 'string', 'in:created,updated,deleted'],
            'user_id' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $logs = ActivityLog::query()
            ->with('user')
            ->when(
                $data['subject_type'] ?? null,
                fn ($q, $v) => $q->where('subject_type', self::SUBJECT_TYPE_MAP[$v])
            )
            ->when($data['action'] ?? null, fn ($q, $v) => $q->where('action', $v))
            ->when($data['user_id'] ?? null, fn ($q, $v) => $q->where('user_id', $v))
            ->when($data['from'] ?? null, fn ($q, $v) => $q->where('created_at', '>=', $v))
            ->when($data['to'] ?? null, fn ($q, $v) => $q->where('created_at', '<=', $v))
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(50);

        return response()->json([
            'data' => ActivityLogResource::collection($logs),
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
