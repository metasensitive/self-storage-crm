<?php

namespace App\Http\Requests\Support;

use Illuminate\Foundation\Http\FormRequest;

class StoreTicketRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Доступ ограничивается role:manager в роутере — здесь true достаточно.
        return true;
    }

    public function rules(): array
    {
        $maxFiles = (int) config('support.attachments.max_files_per_message', 5);
        $maxKb = (int) config('support.attachments.max_file_size_kb', 10240);
        $mimes = implode(',', (array) config('support.attachments.mimes', []));

        return [
            'subject' => ['required', 'string', 'min:3', 'max:255'],
            // body — обязателен только если нет вложений; чисто-вложенческое
            // сообщение допустимо.
            'body' => ['required_without:attachments', 'nullable', 'string', 'max:5000'],
            'attachments' => ['nullable', 'array', 'max:' . $maxFiles],
            'attachments.*' => ['file', 'max:' . $maxKb, 'mimes:' . $mimes],
        ];
    }

    public function messages(): array
    {
        return [
            'subject.required' => 'Тема обращения обязательна',
            'subject.min' => 'Тема должна быть не короче 3 символов',
            'subject.max' => 'Тема не длиннее 255 символов',
            'body.required_without' => 'Введите сообщение или прикрепите файл',
            'body.max' => 'Сообщение не длиннее 5000 символов',
            'attachments.max' => 'Можно прикрепить не более :max файлов',
            'attachments.*.max' => 'Файл больше :max КБ',
            'attachments.*.mimes' => 'Недопустимый тип файла',
        ];
    }
}
