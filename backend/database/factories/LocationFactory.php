<?php

namespace Database\Factories;

use App\Models\Location;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Location>
 */
class LocationFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $cities = [
            ['city' => 'Москва', 'lat' => 55.7558, 'lng' => 37.6173],
            ['city' => 'Санкт-Петербург', 'lat' => 59.9343, 'lng' => 30.3351],
            ['city' => 'Казань', 'lat' => 55.7961, 'lng' => 49.1064],
            ['city' => 'Екатеринбург', 'lat' => 56.8389, 'lng' => 60.6057],
            ['city' => 'Новосибирск', 'lat' => 55.0084, 'lng' => 82.9357],
        ];

        $city = $this->faker->randomElement($cities);

        return [
            'name' => 'ЖК ' . $this->faker->unique()->streetName(),
            'city' => $city['city'],
            'address' => $this->faker->streetAddress(),
            'latitude' => $city['lat'] + $this->faker->randomFloat(4, -0.05, 0.05),
            'longitude' => $city['lng'] + $this->faker->randomFloat(4, -0.05, 0.05),
            'status' => $this->faker->randomElement(['active', 'active', 'active', 'inactive']),
        ];
    }
}
