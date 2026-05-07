<?php

namespace Database\Factories;

use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Unit>
 */
class UnitFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'number' => $this->faker->unique()->numberBetween(1, 10000),

            'size' => $this->faker->randomFloat(2, 1, 15),
            'price' => $this->faker->randomFloat(2, 100, 500),

            'status' => $this->faker->randomElement([
                Unit::STATUS_FREE ?? 'free',
                Unit::STATUS_FREE ?? 'free',
                Unit::STATUS_FREE ?? 'free',
                Unit::STATUS_FREE ?? 'free',
                Unit::STATUS_RENTED ?? 'rented',
                Unit::STATUS_RESERVED ?? 'reserved',
                Unit::STATUS_BLOCKED ?? 'blocked',
            ]),
        ];
    }
}
