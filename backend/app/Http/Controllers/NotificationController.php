<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Список уведомлений текущего пользователя — последние 50, последние сверху.
     *
     * @tags Уведомления
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $items = $user->notifications()
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn ($n) => [
                'id' => $n->id,
                'type' => $n->data['type'] ?? 'unknown',
                'data' => $n->data,
                'read_at' => $n->read_at?->toIso8601String(),
                'created_at' => $n->created_at->toIso8601String(),
            ]);

        return response()->json([
            'data' => $items,
            'meta' => [
                'unread_count' => $user->unreadNotifications()->count(),
            ],
        ]);
    }

    /**
     * Пометить одно уведомление прочитанным.
     *
     * @tags Уведомления
     */
    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();
        return response()->json(['message' => 'OK']);
    }

    /**
     * Пометить все уведомления прочитанными.
     *
     * @tags Уведомления
     */
    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['message' => 'OK']);
    }
}
