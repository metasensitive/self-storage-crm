<?php

namespace App\Http\Requests\User;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:32'],
            'role' => ['required', 'string', 'in:admin,manager'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Имя обязательно',
            'name.max' => 'Имя не должно быть длиннее 100 символов',
            'email.required' => 'Email обязателен',
            'email.email' => 'Введите корректный email',
            'email.unique' => 'Пользователь с таким email уже существует',
            'password.required' => 'Пароль обязателен',
            'password.min' => 'Пароль должен быть не менее 8 символов',
            'password.max' => 'Пароль не должен превышать 32 символа',
            'role.required' => 'Роль обязательна',
            'role.in' => 'Роль должна быть admin или manager',
        ];
    }
}
