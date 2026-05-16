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
            'created_at' => $this->created_at?->toISOString(),
        ];
    }
}
