<?php

namespace App\Http\Requests\Profile;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
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
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($this->user()->id)
            ]
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Имя обязательно',
            'name.max' => 'Имя не должно быть длиннее 100 символов',
            'email.required' => 'Email обязателен',
            'email.email' => 'Введите корректный Email',
            'email.unique' => 'Этот Email уже используется'
        ];
    }
}
