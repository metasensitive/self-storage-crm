<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ActivityLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'action' => $this->action,
            // На фронте проще оперировать коротким именем: 'Location' вместо
            // 'App\Models\Location'. Полное FQCN остаётся в БД для возможной
            // обратной полиморфной выборки.
            'subject_type' => class_basename($this->subject_type),
            'subject_id' => $this->subject_id,
            'subject_label' => $this->subject_label,
            'changes' => $this->changes,
            'ip_address' => $this->ip_address,
            'user_agent' => $this->user_agent,
            'created_at' => $this->created_at?->toIso8601String(),
            'user' => $this->whenLoaded('user', function () {
                if (! $this->user) {
                    return null;
                }
                return [
                    'id' => $this->user->id,
                    'name' => $this->user->name,
                    'email' => $this->user->email,
                    'avatar_url' => $this->user->avatar_url,
                ];
            }),
        ];
    }
}
