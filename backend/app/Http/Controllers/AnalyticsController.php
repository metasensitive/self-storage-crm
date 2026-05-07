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

    public function network(): JsonResponse
    {
        return response()->json([
            'data' => $this->analyticsService->network(),
        ]);
    }

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
