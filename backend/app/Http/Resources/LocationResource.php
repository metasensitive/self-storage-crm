<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LocationResource extends JsonResource
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
            'name' => $this->name,
            'city' => $this->city,
            'address' => $this->address,
            'latitude' => $this->latitude !== null ? (float)$this->latitude : null,
            'longitude' => $this->longitude !== null ? (float)$this->longitude : null,
            'status' => $this->status,
            'containers_count' => (int)($this->containers_count ?? 0),
            'units_count' => (int)($this->units_count ?? 0),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
