<?php

namespace App\Http\Requests\Container;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreContainerRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'location_id' => ['required', 'integer', 'exists:locations,id'],
            // Код — опциональный. Если не передан, контроллер сгенерирует
            // следующий по шаблону «C-NNN». Передача допускается на случай
            // ручного управления нумерацией.
            'code' => ['nullable', 'string', 'max:50', 'unique:containers,code'],
            'units_count' => ['required', 'integer', 'min:1', 'max:100'],
            'status' => ['required', 'string', 'in:active,inactive,maintenance'],
            'installed_at' => ['nullable', 'date'],
        ];
    }

    public function messages(): array
    {
        return [
            'location_id.required' => 'Локация обязательна',
            'location_id.exists' => 'Указанная локация не существует',
            'code.unique' => 'Контейнер с таким кодом уже существует',
            'code.max' => 'Код не должен превышать 50 символов',
            'units_count.required' => 'Количество кладовок обязательно',
            'units_count.min' => 'Минимум 1 кладовка',
            'units_count.max' => 'Максимум 100 кладовок',
            'status.required' => 'Статус обязателен',
            'status.in' => 'Статус должен быть active, inactive или maintenance',
            'installed_at.date' => 'Некорректная дата установки',
        ];
    }
}
