<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UnitResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'number' => $this->number,
            'size' => (float)($this->size ?? 0),
            'price' => (float)($this->price ?? 0),
            'status' => $this->status,
            'active_rents_count' => (int)($this->active_rents_count ?? 0),
            'container' => $this->whenLoaded('container', fn() => [
                'id' => $this->container->id,
                'code' => $this->container->code,
                // relationLoaded на самой container-модели — корректная замена
                // dot-нотации в whenLoaded(), которая не поддерживается.
                'location' => $this->container->relationLoaded('location')
                    && $this->container->location
                    ? [
                        'id' => $this->container->location->id,
                        'name' => $this->container->location->name,
                        'city' => $this->container->location->city,
                    ]
                    : null,
            ]),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
