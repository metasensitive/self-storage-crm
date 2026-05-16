<?php

namespace App\Http\Resources\Support;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AttachmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'original_name' => $this->original_name,
            'mime' => $this->mime,
            'size_bytes' => (int) $this->size_bytes,
            'is_image' => $this->isImage(),
            'download_url' => url('/api/v1/support/attachments/' . $this->id . '/download'),
        ];
    }
}
