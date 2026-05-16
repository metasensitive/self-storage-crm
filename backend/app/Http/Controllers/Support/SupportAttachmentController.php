<?php

namespace App\Http\Controllers\Support;

use App\Http\Controllers\Controller;
use App\Models\SupportAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SupportAttachmentController extends Controller
{
    /**
     * Скачать вложение. Доступ — владельцу тикета или админу.
     * Файл лежит на приватном диске; стримим через `Storage::download`.
     *
     * @tags Поддержка
     */
    public function download(Request $request, SupportAttachment $attachment): StreamedResponse
    {
        $message = $attachment->message;
        $ticket = $message?->ticket;
        $user = $request->user();

        abort_unless(
            $ticket && ($user->isAdmin() || (int) $ticket->manager_id === (int) $user->id),
            404
        );

        $disk = Storage::disk($attachment->disk);
        abort_unless($disk->exists($attachment->path), 404, 'Файл не найден');

        return $disk->download($attachment->path, $attachment->original_name, [
            'Content-Type' => $attachment->mime,
        ]);
    }
}
