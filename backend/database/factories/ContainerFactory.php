<?php

namespace Database\Factories;

use App\Models\Container;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Container>
 */
class ContainerFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'code' => 'CONT-' . $this->faker->unique()->numerify('####'),

            'units_count' => 0,

            'status' => $this->faker->randomElement([
                Container::STATUS_ACTIVE ?? 'active',
                Container::STATUS_ACTIVE ?? 'active',
                Container::STATUS_ACTIVE ?? 'active',
                Container::STATUS_MAINTENANCE ?? 'maintenance',
            ]),

            'installed_at' => $this->faker->dateTimeBetween('-1 year', 'now'),
        ];
    }
}
