<?php

namespace App\Http\Controllers\Support;

use App\Http\Controllers\Controller;
use App\Http\Resources\Support\MessageResource;
use App\Models\SupportMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupportSearchController extends Controller
{
    /**
     * Поиск по сообщениям тикетов поддержки.
     * Менеджер ищет только в своих тикетах; админ — во всех.
     * PostgreSQL ILIKE: case-insensitive substring без отдельного индекса.
     *
     * @tags Поддержка
     */
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:255'],
            'ticket_id' => ['nullable', 'integer', 'exists:support_tickets,id'],
        ]);

        $user = $request->user();
        $needle = '%' . $validated['q'] . '%';

        $results = SupportMessage::query()
            ->with(['author:id,name,email,role,avatar', 'ticket:id,manager_id,subject'])
            ->where('body', 'ilike', $needle)
            ->whereHas('ticket', function ($q) use ($user, $validated) {
                if (!$user->isAdmin()) {
                    $q->where('manager_id', $user->id);
                }
                if (!empty($validated['ticket_id'])) {
                    $q->where('id', $validated['ticket_id']);
                }
            })
            ->orderBy('created_at', 'desc')
            ->limit(100)
            ->get();

        return response()->json([
            'data' => MessageResource::collection($results),
        ]);
    }
}
