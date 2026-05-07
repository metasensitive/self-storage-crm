<?php

namespace App\Http\Controllers;

use App\Services\AnalyticsService;
use Illuminate\Http\JsonResponse;

class AnalyticsController extends Controller
{
    private AnalyticsService $analyticsService;

    public function __construct(AnalyticsService $analyticsService)
    {
        $this->analyticsService = $analyticsService;
    }

    /**
     * Аналитика по всей сети.
     *
     * Общее количество кладовок, занятость, доход за месяц.
     * Доступ: администратор и менеджер.
     *
     * @tags Аналитика
     */
    public function network(): JsonResponse
    {
        return response()->json([
            'data' => $this->analyticsService->network(),
        ]);
    }

    /**
     * Аналитика по локации.
     *
     * Статистика по конкретной локации.
     * Доступ: администратор и менеджер.
     *
     * @tags Аналитика
     */
    public function location(int $locationId): JsonResponse
    {
        $data = $this->analyticsService->location($locationId);

        if (!$data) {
            return response()->json([
                'message' => 'Локация не найдена'
            ], 404);
        }

        return response()->json([
            'data' => $data,
        ]);
    }

    /**
     * Аналитика по контейнеру.
     *
     * Статистика по конкретному контейнеру.
     * Доступ: администратор и менеджер.
     *
     * @tags Аналитика
     */
    public function container(int $containerId): JsonResponse
    {
        $data = $this->analyticsService->container($containerId);

        if (!$data) {
            return response()->json([
                'message' => 'Контейнер не найден'
            ], 404);
        }

        return response()->json([
            'data' => $data,
        ]);
    }
}
