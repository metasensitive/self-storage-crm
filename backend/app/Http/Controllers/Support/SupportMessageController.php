<?php

namespace App\Http\Controllers\Support;

use App\Http\Controllers\Controller;
use App\Http\Requests\Support\StoreMessageRequest;
use App\Http\Requests\Support\UpdateMessageRequest;
use App\Http\Resources\Support\MessageResource;
use App\Models\SupportMessage;
use App\Models\SupportTicket;
use App\Services\SupportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class SupportMessageController extends Controller
{
    public function __construct(private SupportService $support)
    {
    }

    /**
     * Сообщения тикета — пагинация курсором по created_at, чтобы load-more
     * наверху работал без проблем дрифта при новых сообщениях.
     *
     * @tags Поддержка
     */
    public function index(Request $request, SupportTicket $ticket): JsonResponse
    {
        $this->authorizeTicket($request, $ticket);

        $messages = $ticket->messages()
            ->withTrashed()
            ->with([
                'author:id,name,email,role,avatar',
                'attachments',
                'reads',
                // Цитата (reply): подгружается одним JOIN'ом — без N+1
                // на ленту, где много reply-сообщений. withTrashed()
                // на самой relation-query — чтобы удалённый оригинал
                // тоже пришёл (фронт покажет «Сообщение удалено»).
                'replyTo' => function ($q) {
                    $q->withTrashed()->with('author:id,name,email,role,avatar');
                },
            ])
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->cursorPaginate(50);

        return response()->json([
            'data' => MessageResource::collection($messages),
            'meta' => [
                'next_cursor' => $messages->nextCursor()?->encode(),
                'has_more' => $messages->hasMorePages(),
            ],
        ]);
    }

    /**
     * Отправить сообщение в тикет (любой стороной).
     *
     * @tags Поддержка
     */
    public function store(StoreMessageRequest $request, SupportTicket $ticket): JsonResponse
    {
        $this->authorizeTicket($request, $ticket);

        try {
            $message = $this->support->sendMessage(
                $ticket,
                $request->user(),
                $request->input('body'),
                $request->file('attachments') ?? [],
                $request->integer('reply_to_message_id') ?: null,
            );
        } catch (InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $message->load([
            'author:id,name,email,role,avatar',
            'attachments',
            'reads',
            'replyTo.author:id,name,email,role,avatar',
        ]);

        return response()->json([
            'message' => 'Сообщение отправлено',
            'data' => new MessageResource($message),
        ], 201);
    }

    /**
     * Редактирование своего сообщения в окне 10 минут.
     *
     * @tags Поддержка
     */
    public function update(UpdateMessageRequest $request, SupportMessage $message): JsonResponse
    {
        $this->authorizeTicket($request, $message->ticket);

        $updated = $this->support->updateMessage(
            $message,
            $request->user(),
            $request->string('body')->toString(),
        );

        $updated->load(['author:id,name,email,role,avatar', 'attachments', 'reads']);

        return response()->json([
            'message' => 'Сообщение обновлено',
            'data' => new MessageResource($updated),
        ]);
    }

    /**
     * Soft-delete своего сообщения в окне 10 минут.
     *
     * @tags Поддержка
     */
    public function destroy(Request $request, SupportMessage $message): JsonResponse
    {
        $this->authorizeTicket($request, $message->ticket);

        $this->support->deleteMessage($message, $request->user());

        return response()->json(['message' => 'Сообщение удалено']);
    }

    private function authorizeTicket(Request $request, ?SupportTicket $ticket): void
    {
        $user = $request->user();
        abort_unless(
            $ticket && ($user->isAdmin() || (int) $ticket->manager_id === (int) $user->id),
            404
        );
    }
}
