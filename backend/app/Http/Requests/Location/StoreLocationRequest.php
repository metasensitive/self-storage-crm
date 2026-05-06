<?php

namespace App\Http\Requests\Location;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreLocationRequest extends FormRequest
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
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'city' => ['required', 'string', 'min:2', 'max:100'],
            'address' => ['required', 'string', 'min:5', 'max:500'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'status' => ['required', 'string', 'in:active,inactive'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Название локации обязательно',
            'name.min' => 'Название должно быть не короче 2 символов',
            'name.max' => 'Название не должно превышать 255 символов',
            'city.required' => 'Город обязателен',
            'city.min' => 'Город должен быть не короче 2 символов',
            'city.max' => 'Город не должен превышать 100 символов',
            'address.required' => 'Адрес обязателен',
            'address.min' => 'Адрес должен быть не короче 5 символов',
            'address.max' => 'Адрес не должен превышать 500 символов',
            'latitude.required' => 'Широта обязательна',
            'latitude.between' => 'Широта должна быть от -90 до 90',
            'longitude.required' => 'Долгота обязательна',
            'longitude.between' => 'Долгота должна быть от -180 до 180',
            'status.required' => 'Статус обязателен',
            'status.in' => 'Статус должен быть active или inactive',
        ];
    }
}
