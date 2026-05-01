<?php

namespace App\Http\Requests\Auth;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
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
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'email', 'exists:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }
    public function messages(): array {
        return [
          'token.required' => 'Токен сброса пароля обязателен',
            'email.required' => 'Email обязателен',
            'email.exists' => 'Пользователь с таким Email не найден',
            'password.required' => 'Введите новый пароль',
            'password.min' => 'Пароль должен иметь не менее 8 символов',
            'password.confirmed' => 'Пароли не совпадают',
        ];
    }
}
