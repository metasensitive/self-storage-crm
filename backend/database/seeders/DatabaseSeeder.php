<?php

namespace Database\Seeders;

use App\Models\Container;
use App\Models\Location;
use App\Models\Rent;
use App\Models\Unit;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Запуск сидирования...');

        // пользователи
        $this->command->info('Создание пользователей...');
        User::create([
            'name' => 'Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('password'),
            'role' => User::ROLE_ADMIN,
        ]);

        User::create([
            'name' => 'Manager',
            'email' => 'manager@example.com',
            'password' => Hash::make('password'),
            'role' => User::ROLE_MANAGER,
        ]);

        // локации
        $this->command->info('Создание локаций...');
        $locations = Location::factory(3)->create();

        // контейнеры и вложенные сущности
        $this->command->info('Создание контейнеров, кладовок и аренд...');

        foreach ($locations as $location) {
            $containers = Container::factory(2)->create([
                'location_id' => $location->id,
            ]);

            foreach ($containers as $container) {
                $units = Unit::factory(10)->create([
                    'container_id' => $container->id,
                ]);

                foreach ($units as $unit) {
                    if ($unit->status === Unit::STATUS_RENTED) {
                        $dateFrom = Carbon::instance(fake()->dateTimeBetween('-2 months', 'now'));
                        $dateTo = $dateFrom->copy()->addDays(fake()->numberBetween(10, 30));
                        $days = $dateFrom->diffInDays($dateTo) + 1;

                        Rent::factory()->create([
                            'unit_id' => $unit->id,
                            'date_from' => $dateFrom,
                            'date_to' => $dateTo,
                            'price' => $unit->price * $days,
                            'status' => Rent::STATUS_ACTIVE,
                        ]);
                    } elseif ($unit->status === Unit::STATUS_RESERVED && fake()->boolean(50)) {
                        Rent::factory()->create([
                            'unit_id' => $unit->id,
                            'status' => Rent::STATUS_FINISHED,
                            'price' => $unit->price * fake()->numberBetween(10, 30),
                        ]);
                    }
                }
            }
        }
        $this->command->info('Сидирование завершено.');
    }
}
