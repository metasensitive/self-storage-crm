<?php

namespace App\Http\Requests\Rent;

use App\Models\Rent;
use App\Models\Unit;
use Carbon\Carbon;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'unit_id' => (int)$this->unit_id,
        ]);
    }

    public function rules(): array
    {
        return [
            'unit_id' => [
                'required',
                'integer',
                Rule::exists('units', 'id')->where('status', Unit::STATUS_FREE),
            ],
            'date_from' => ['required', 'date', 'after_or_equal:today'],
            'date_to' => [
                'required', 'date', 'after:date_from',
                function ($attribute, $value, $fail) {
                    if (!$this->date_from) {
                        return;
                    }

                    $dateFrom = Carbon::parse($this->date_from);
                    $dateTo = Carbon::parse($value);
                    $days = $dateFrom->diffInDays($dateTo) + 1;

                    if ($days < 10) {
                        $fail('Минимальный срок аренды — 10 дней');
                    }

                    $hasOverlap = Rent::where('unit_id', $this->unit_id)
                        ->where('status', Rent::STATUS_ACTIVE)
                        ->where(function ($q) use ($dateFrom, $dateTo) {
                            $q->whereBetween('date_from', [$dateFrom, $dateTo])
                                ->orWhereBetween('date_to', [$dateFrom, $dateTo])
                                ->orWhere(function ($q2) use ($dateFrom, $dateTo) {
                                    $q2->where('date_from', '<=', $dateFrom)
                                        ->where('date_to', '>=', $dateTo);
                                });
                        })->exists();

                    if ($hasOverlap) {
                        $fail('Кладовка уже занята на выбранные даты');
                    }
                },
            ],
            'price' => ['nullable', 'decimal:0,2', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return [
            'unit_id.required' => 'Кладовка обязательна',
            'unit_id.exists' => 'Указанная кладовка не существует или недоступна',
            'date_from.required' => 'Дата начала аренды обязательна',
            'date_from.after_or_equal' => 'Дата начала не может быть в прошлом',
            'date_to.required' => 'Дата окончания аренды обязательна',
            'date_to.after' => 'Дата окончания должна быть позже даты начала',
        ];
    }
}
