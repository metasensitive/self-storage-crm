<?php

namespace Database\Factories;

use App\Models\Rent;
use Illuminate\Database\Eloquent\Factories\Factory;
use Carbon\Carbon;

/**
 * @extends Factory<Rent>
 */
class RentFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $dateFrom = Carbon::instance($this->faker->dateTimeBetween('-2 months', 'now'));
        $dateTo = $dateFrom->copy()->addDays($this->faker->numberBetween(10, 30));
        $days = $dateFrom->diffInDays($dateTo) + 1;

        return [
            'date_from' => $dateFrom,
            'date_to' => $dateTo,

            'price' => fn($attrs) => isset($attrs['unit_id'])
                ? Unit::find($attrs['unit_id'])?->price * $days
                : $this->faker->randomFloat(2, 1000, 15000),

            'status' => $this->faker->randomElement([
                Rent::STATUS_ACTIVE ?? 'active',
                Rent::STATUS_ACTIVE ?? 'active',
                Rent::STATUS_FINISHED ?? 'finished',
                Rent::STATUS_CANCELLED ?? 'cancelled',
            ]),
        ];
    }
}
