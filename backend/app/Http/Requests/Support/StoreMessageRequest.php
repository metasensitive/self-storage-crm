<?php

namespace App\Http\Requests\Support;

use App\Models\SupportMessage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $maxFiles = (int) config('support.attachments.max_files_per_message', 5);
        $maxKb = (int) config('support.attachments.max_file_size_kb', 10240);
        $mimes = implode(',', (array) config('support.attachments.mimes', []));

        // reply_to_message_id должен указывать на:
        // - сообщение того же тикета;
        // - тип 'message' (не системное «закрыл/переоткрыл»);
        // - не soft-deleted.
        // Иначе фронт мог бы ответить на чужое сообщение из другого
        // тикета — потенциальная утечка контента.
        $ticketId = $this->route('ticket')?->id;
        $replyToRule = $ticketId
            ? Rule::exists('support_messages', 'id')->where(function ($q) use ($ticketId) {
                $q->where('ticket_id', $ticketId)
                    ->where('type', SupportMessage::TYPE_MESSAGE)
                    ->whereNull('deleted_at');
            })
            : 'integer';

        return [
            'body' => ['required_without:attachments', 'nullable', 'string', 'max:5000'],
            'attachments' => ['nullable', 'array', 'max:' . $maxFiles],
            'attachments.*' => ['file', 'max:' . $maxKb, 'mimes:' . $mimes],
            'reply_to_message_id' => ['nullable', 'integer', $replyToRule],
        ];
    }

    public function messages(): array
    {
        return [
            'body.required_without' => 'Введите сообщение или прикрепите файл',
            'body.max' => 'Сообщение не длиннее 5000 символов',
            'attachments.max' => 'Можно прикрепить не более :max файлов',
            'attachments.*.max' => 'Файл больше :max КБ',
            'attachments.*.mimes' => 'Недопустимый тип файла',
            'reply_to_message_id.exists' => 'Цитируемое сообщение не найдено в этом тикете',
        ];
    }
}
