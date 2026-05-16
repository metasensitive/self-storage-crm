<?php

namespace App\Http\Controllers\Support;

use App\Http\Controllers\Controller;
use App\Http\Requests\Support\StoreTicketRequest;
use App\Http\Requests\Support\UpdateTicketStatusRequest;
use App\Http\Resources\Support\TicketResource;
use App\Models\SupportTicket;
use App\Services\SupportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupportTicketController extends Controller
{
    public function __construct(private SupportService $support)
    {
    }

    /**
     * Список тикетов: админ — все, менеджер — только свои.
     * Фильтр по статусу: open / closed.
     *
     * @tags Поддержка
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $status = $request->query('status');

        $tickets = SupportTicket::query()
            ->visibleTo($user)
            ->with(['manager:id,name,email,role,avatar'])
            ->when($status, fn($q, $v) => $q->where('status', $v))
            // Только что писавшие — сверху; никогда не писавшие — по дате создания.
            ->orderByRaw('COALESCE(last_message_at, created_at) DESC')
            ->paginate(50);

        return response()->json([
            'data' => TicketResource::collection($tickets),
            'meta' => [
                'current_page' => $tickets->currentPage(),
                'last_page' => $tickets->lastPage(),
                'per_page' => $tickets->perPage(),
                'total' => $tickets->total(),
            ],
        ]);
    }

    /**
     * Создание тикета (только менеджер).
     *
     * @tags Поддержка
     */
    public function store(StoreTicketRequest $request): JsonResponse
    {
        $user = $request->user();

        $ticket = $this->support->createTicket(
            $user,
            $request->string('subject')->toString(),
            $request->input('body'),
            $request->file('attachments') ?? [],
        );

        $ticket->load(['manager:id,name,email,role,avatar']);

        return response()->json([
            'message' => 'Тикет создан',
            'data' => new TicketResource($ticket),
        ], 201);
    }

    /**
     * Просмотр тикета.
     *
     * @tags Поддержка
     */
    public function show(Request $request, SupportTicket $ticket): JsonResponse
    {
        $this->authorizeTicket($request, $ticket);

        $ticket->load(['manager:id,name,email,role,avatar']);

        return response()->json([
            'data' => new TicketResource($ticket),
        ]);
    }

    /**
     * Смена статуса тикета — закрыть или переоткрыть.
     * Доступ: админ или владелец-менеджер.
     *
     * @tags Поддержка
     */
    public function updateStatus(UpdateTicketStatusRequest $request, SupportTicket $ticket): JsonResponse
    {
        $this->authorizeTicket($request, $ticket);

        $status = $request->string('status')->toString();
        $ticket = $status === SupportTicket::STATUS_CLOSED
            ? $this->support->closeTicket($ticket, $request->user())
            : $this->support->reopenTicket($ticket);

        $ticket->load(['manager:id,name,email,role,avatar']);

        return response()->json([
            'message' => 'Статус обновлён',
            'data' => new TicketResource($ticket),
        ]);
    }

    /**
     * Отметить все сообщения тикета прочитанными для текущего пользователя.
     *
     * @tags Поддержка
     */
    public function markRead(Request $request, SupportTicket $ticket): JsonResponse
    {
        $this->authorizeTicket($request, $ticket);

        $marked = $this->support->markRead($ticket, $request->user());

        return response()->json([
            'message' => 'OK',
            'data' => ['marked' => $marked],
        ]);
    }

    /**
     * Суммарный счётчик непрочитанных тикетов и сообщений — для бейджа в сайдбаре.
     *
     * @tags Поддержка
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $user = $request->user();

        // Считаем непрочитанные сообщения (не свои, не удалённые) во всех
        // тикетах, видимых пользователю — одним запросом через подзапрос.
        $count = \DB::table('support_messages')
            ->join('support_tickets', 'support_tickets.id', '=', 'support_messages.ticket_id')
            ->whereNull('support_messages.deleted_at')
            ->where('support_messages.author_id', '!=', $user->id)
            ->when(!$user->isAdmin(), fn($q) => $q->where('support_tickets.manager_id', $user->id))
            ->whereNotExists(function ($sub) use ($user) {
                $sub->select(\DB::raw(1))
                    ->from('support_message_reads')
                    ->whereColumn('support_message_reads.message_id', 'support_messages.id')
                    ->where('support_message_reads.user_id', $user->id);
            })
            ->count();

        return response()->json([
            'data' => ['unread' => (int) $count],
        ]);
    }

    private function authorizeTicket(Request $request, SupportTicket $ticket): void
    {
        $user = $request->user();
        abort_unless(
            $user->isAdmin() || (int) $ticket->manager_id === (int) $user->id,
            404
        );
    }
}
