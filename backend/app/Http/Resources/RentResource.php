<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RentResource extends JsonResource
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
            'unit' => $this->whenLoaded('unit', fn() => [
                'id' => $this->unit->id,
                'number' => $this->unit->number,
                // Проверяем загрузку вложенных связей через relationLoaded на
                // соответствующей модели — dot-нотация в whenLoaded() не поддерживается
                // и всегда возвращает MissingValue.
                'container' => $this->unit->relationLoaded('container') && $this->unit->container
                    ? [
                        'id' => $this->unit->container->id,
                        'code' => $this->unit->container->code,
                        'location' => $this->unit->container->relationLoaded('location')
                            && $this->unit->container->location
                            ? [
                                'id' => $this->unit->container->location->id,
                                'name' => $this->unit->container->location->name,
                                'city' => $this->unit->container->location->city,
                            ]
                            : null,
                    ]
                    : null,
            ]),
            'date_from' => $this->date_from?->toDateString(),
            'date_to' => $this->date_to?->toDateString(),
            'price' => (float)($this->price ?? 0),
            'status' => $this->status,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
