<?php

namespace App\Http\Resources\Support;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isDeleted = $this->deleted_at !== null;

        return [
            'id' => $this->id,
            'type' => $this->type ?? 'message',
            // Если сообщение soft-deleted — тело не отдаём.
            'body' => $isDeleted ? null : $this->body,
            'is_deleted' => $isDeleted,
            'author' => $this->whenLoaded('author', fn() => [
                'id' => $this->author->id,
                'name' => $this->author->name,
                'role' => $this->author->role,
                'avatar_url' => $this->author->avatar_url,
            ]),
            'attachments' => $isDeleted
                ? []
                : AttachmentResource::collection($this->whenLoaded('attachments')),
            'edited_at' => $this->edited_at?->toISOString(),
            'deleted_at' => $this->deleted_at?->toISOString(),
            'read_by' => $this->whenLoaded('reads', fn() => $this->reads->map(fn($r) => [
                'user_id' => (int) $r->user_id,
                'read_at' => $r->read_at?->toISOString(),
            ])),
            // Цитата (reply): id оригинала + author + короткое превью.
            // Если оригинал soft-deleted, всё равно отдаём id + is_deleted=true,
            // фронт покажет плашку «Сообщение удалено».
            // reply_to_message_id может быть NULL (обычное сообщение) или
            // указывать на удалённый ряд (after SET NULL). Различаем:
            //   - reply_to_message_id NULL → поле не отдаём (этого reply вообще не было).
            //   - relation null после SET NULL → отдаём { id: null, is_deleted: true }.
            'reply_to' => $this->when(
                $this->reply_to_message_id !== null,
                function () {
                    /** @var \App\Models\SupportMessage|null $original */
                    $original = $this->relationLoaded('replyTo') ? $this->replyTo : null;
                    if (!$original) {
                        return ['id' => null, 'is_deleted' => true];
                    }
                    $author = $original->relationLoaded('author') ? $original->author : null;
                    return [
                        'id' => (int) $original->id,
                        'author' => $author ? [
                            'id' => (int) $author->id,
                            'name' => (string) $author->name,
                            'role' => (string) $author->role,
                        ] : null,
                        // Превью режем до 140 символов чтобы не раздувать payload —
                        // в UI mini-card всё равно ограничен 1 строкой ellipsis.
                        'preview' => $original->deleted_at !== null
                            ? null
                            : mb_substr((string) ($original->body ?? ''), 0, 140),
                        'is_deleted' => $original->deleted_at !== null,
                    ];
                },
            ),
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
