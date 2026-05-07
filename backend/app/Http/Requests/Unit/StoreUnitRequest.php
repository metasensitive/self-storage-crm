<?php

namespace App\Http\Requests\Unit;

use App\Models\Unit;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUnitRequest extends FormRequest
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
            'container_id' => ['required', 'integer', 'exists:containers,id'],
            'number' => [
                'required',
                'integer',
                'min:1',
                Rule::unique('units', 'number')->where('container_id', $this->input('container_id'))
            ],
            'size' => ['required', 'numeric', 'min:0.5', 'max:999.99'],
            'price' => ['required', 'numeric', 'min:0', 'max:99999999.99'],
            'status' => ['required', 'string', Rule::in(Unit::getAvailableStatuses())],
        ];
    }

    public function messages(): array
    {
        return [
            'container_id.required' => 'Контейнер обязателен',
            'container_id.exists' => 'Указанный контейнер не существует',
            'number.required' => 'Номер кладовки обязателен',
            'number.unique' => 'Кладовка с таким номером уже существует в этом контейнере',
            'number.min' => 'Номер должен быть положительным',
            'size.required' => 'Размер обязателен',
            'size.numeric' => 'Размер должен быть числом',
            'size.min' => 'Минимальный размер — 0.5 м²',
            'size.max' => 'Максимальный размер — 999.99 м²',
            'price.required' => 'Цена обязательна',
            'price.numeric' => 'Цена должна быть числом',
            'price.min' => 'Цена не может быть отрицательной',
            'price.max' => 'Максимальная цена — 99 999 999.99 руб.',
            'status.required' => 'Статус обязателен',
            'status.in' => 'Недопустимый статус',
        ];
    }
}
