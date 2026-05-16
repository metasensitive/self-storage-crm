<?php

namespace App\Http\Requests\Support;

use App\Models\SupportTicket;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTicketStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['required', 'string', Rule::in(SupportTicket::getAvailableStatuses())],
        ];
    }

    public function messages(): array
    {
        return [
            'status.required' => 'Статус обязателен',
            'status.in' => 'Недопустимый статус тикета',
        ];
    }
}
