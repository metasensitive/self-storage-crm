<?php

namespace App\Http\Requests\Support;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:5000'],
        ];
    }

    public function messages(): array
    {
        return [
            'body.required' => 'Сообщение не может быть пустым',
            'body.max' => 'Сообщение не длиннее 5000 символов',
        ];
    }
}
