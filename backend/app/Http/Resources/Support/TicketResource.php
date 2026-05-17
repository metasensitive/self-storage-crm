<?php

namespace App\Http\Resources\Support;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $viewer = $request->user();

        return [
            'id' => $this->id,
            'subject' => $this->subject,
            'status' => $this->status,
            'is_closed' => $this->isClosed(),
            'manager' => $this->whenLoaded('manager', fn() => [
                'id' => $this->manager->id,
                'name' => $this->manager->name,
                'role' => $this->manager->role,
                'avatar_url' => $this->manager->avatar_url,
            ]),
            'last_message_at' => $this->last_message_at?->toISOString(),
            'last_message_preview' => $this->last_message_preview,
            // Метаданные последнего сообщения тикета — для индикатора
            // прочитано/непрочитано в списке. Доступны только если
            // явно eager-loaded ('lastMessage' + withCount read_by_others).
            'last_message' => $this->whenLoaded('lastMessage', function () {
                if (!$this->lastMessage) return null;
                return [
                    'id' => (int) $this->lastMessage->id,
                    'type' => $this->lastMessage->type ?? 'message',
                    'author_id' => (int) $this->lastMessage->author_id,
                    'read_by_others' =>
                        ((int) ($this->lastMessage->read_by_others_count ?? 0)) > 0,
                ];
            }),
            // Считаем непрочитанные для текущего viewer'a — у admin'а и
            // у менеджера-владельца разные счётчики на один и тот же тикет.
            'unread_count' => $viewer ? $this->unreadCountFor($viewer) : 0,
            'closed_at' => $this->closed_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
