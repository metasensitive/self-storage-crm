<?php

namespace Database\Seeders;

use App\Models\Container;
use App\Models\Location;
use App\Models\Rent;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Hash;

/**
 * Демо-данные для railway-стенда и локальной разработки.
 *
 * Сидер ИДЕМПОТЕНТЕН: пользователи через firstOrCreate; локации/контейнеры/
 * кладовки/аренды создаются только если таблица locations пуста. Это даёт
 * безопасный повторный запуск из release.sh на каждом деплое.
 *
 * Раньше тут использовались Factory + faker — но faker лежит в require-dev
 * и в production-образе его нет, фабрики падали с
 * «Call to a member function randomElement() on null». Текущий сидер
 * полностью независим от faker и подходит для production-окружения.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('▶ Сидинг: пользователи (firstOrCreate)…');
        $this->seedUsers();

        if (Location::count() > 0) {
            $this->command->info('▶ Сидинг: демо-сущности уже есть, пропускаем.');
            return;
        }

        $this->command->info('▶ Сидинг: локации, контейнеры, кладовки, аренды…');
        $locations = $this->seedLocations();
        $containers = $this->seedContainers($locations);
        $units = $this->seedUnits($containers);
        $this->seedRents($units);

        $this->command->info('✔ Демо-данные созданы.');
    }

    private function seedUsers(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@example.com'],
            [
                'name' => 'Администратор',
                'password' => Hash::make('password'),
                'role' => User::ROLE_ADMIN,
            ],
        );

        User::firstOrCreate(
            ['email' => 'manager@example.com'],
            [
                'name' => 'Менеджер',
                'password' => Hash::make('password'),
                'role' => User::ROLE_MANAGER,
            ],
        );
    }

    /**
     * Две локации в разных статусах — чтобы было видно фильтрацию active/inactive.
     *
     * @return array<string, Location>
     */
    private function seedLocations(): array
    {
        return [
            'parus' => Location::create([
                'name' => 'ЖК Парус',
                'city' => 'Москва',
                'address' => 'Пресненская набережная, 12',
                'latitude' => 55.7475,
                'longitude' => 37.5378,
                'status' => 'active',
            ]),
            'lesnoy' => Location::create([
                'name' => 'ЖК Лесной квартал',
                'city' => 'Санкт-Петербург',
                'address' => 'Лесной проспект, 65',
                'latitude' => 59.9837,
                'longitude' => 30.3475,
                'status' => 'inactive',
            ]),
        ];
    }

    /**
     * Четыре контейнера со всеми тремя статусами Container'а:
     *   • active — основной рабочий
     *   • maintenance — на обслуживании (новые аренды не принимает)
     *   • inactive — выведен из эксплуатации
     *
     * @param  array<string, Location>  $locations
     * @return array<string, Container>
     */
    private function seedContainers(array $locations): array
    {
        return [
            'c001' => Container::create([
                'location_id' => $locations['parus']->id,
                'code' => 'C-001',
                'units_count' => 8,
                'status' => Container::STATUS_ACTIVE,
                'installed_at' => Carbon::now()->subMonths(6),
            ]),
            'c002' => Container::create([
                'location_id' => $locations['parus']->id,
                'code' => 'C-002',
                'units_count' => 8,
                'status' => Container::STATUS_MAINTENANCE,
                'installed_at' => Carbon::now()->subMonths(4),
            ]),
            'c003' => Container::create([
                'location_id' => $locations['lesnoy']->id,
                'code' => 'C-003',
                'units_count' => 8,
                'status' => Container::STATUS_ACTIVE,
                'installed_at' => Carbon::now()->subMonths(3),
            ]),
            'c004' => Container::create([
                'location_id' => $locations['lesnoy']->id,
                'code' => 'C-004',
                'units_count' => 8,
                'status' => Container::STATUS_INACTIVE,
                'installed_at' => Carbon::now()->subMonths(2),
            ]),
        ];
    }

    /**
     * Кладовки распределены по контейнерам так, чтобы показать все четыре
     * статуса unit (free/reserved/rented/blocked) и связать их с реалистичной
     * картиной: maintenance-контейнер — все free; inactive — все free.
     *
     * @param  array<string, Container>  $containers
     * @return Collection<int, Unit>
     */
    private function seedUnits(array $containers): Collection
    {
        // Размер кладовки (кв. м) → цена за день (₽). Реалистичные ставки
        // self-storage: ~90–500 ₽/день в зависимости от размера.
        $catalog = [
            ['size' => 1, 'price' => 90],
            ['size' => 2, 'price' => 150],
            ['size' => 4, 'price' => 270],
            ['size' => 6, 'price' => 380],
            ['size' => 8, 'price' => 480],
        ];

        $plan = [
            'c001' => [Unit::STATUS_RENTED, Unit::STATUS_RENTED, Unit::STATUS_RENTED,
                       Unit::STATUS_RESERVED, Unit::STATUS_FREE, Unit::STATUS_FREE,
                       Unit::STATUS_FREE, Unit::STATUS_BLOCKED],
            'c002' => array_fill(0, 8, Unit::STATUS_FREE), // на обслуживании
            'c003' => [Unit::STATUS_RENTED, Unit::STATUS_RENTED, Unit::STATUS_RENTED,
                       Unit::STATUS_RENTED, Unit::STATUS_FREE, Unit::STATUS_FREE,
                       Unit::STATUS_FREE, Unit::STATUS_FREE],
            'c004' => array_fill(0, 8, Unit::STATUS_FREE), // выведен из эксплуатации
        ];

        $units = collect();
        foreach ($plan as $containerKey => $statuses) {
            foreach ($statuses as $i => $status) {
                $sz = $catalog[$i % count($catalog)];
                $units->push(Unit::create([
                    'container_id' => $containers[$containerKey]->id,
                    'number' => $i + 1,
                    'size' => $sz['size'],
                    'price' => $sz['price'],
                    'status' => $status,
                ]));
            }
        }

        return $units;
    }

    /**
     * Аренды трёх типов:
     *   • active — на всех rented-кладовках
     *   • finished — прошлые аренды на нескольких из тех же rented-кладовок
     *     (одна кладовка может иметь несколько аренд во времени — это
     *     наполнит график «выручка по дням» за прошлый период)
     *   • cancelled — одна отменённая аренда на reserved-кладовке
     */
    private function seedRents(Collection $units): void
    {
        $rented = $units->where('status', Unit::STATUS_RENTED)->values();

        // Активные аренды для всех rented-кладовок.
        $activeProfiles = [
            ['startDaysAgo' => 3,  'duration' => 30],
            ['startDaysAgo' => 10, 'duration' => 45],
            ['startDaysAgo' => 18, 'duration' => 60],
            ['startDaysAgo' => 25, 'duration' => 90],
            ['startDaysAgo' => 35, 'duration' => 60],
            ['startDaysAgo' => 48, 'duration' => 45],
            ['startDaysAgo' => 60, 'duration' => 30],
        ];
        foreach ($rented as $i => $unit) {
            $p = $activeProfiles[$i % count($activeProfiles)];
            $dateFrom = Carbon::now()->subDays($p['startDaysAgo'])->startOfDay();
            $dateTo = $dateFrom->copy()->addDays($p['duration']);
            Rent::create([
                'unit_id' => $unit->id,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'price' => $unit->price * ($p['duration'] + 1),
                'status' => Rent::STATUS_ACTIVE,
            ]);
        }

        // Прошлые завершённые аренды — раскрашивают график выручки.
        $finishedProfiles = [
            ['startDaysAgo' => 110, 'duration' => 30],
            ['startDaysAgo' => 75,  'duration' => 25],
            ['startDaysAgo' => 50,  'duration' => 20],
        ];
        foreach ($finishedProfiles as $i => $p) {
            $unit = $rented[$i] ?? null;
            if (! $unit) {
                break;
            }
            $dateFrom = Carbon::now()->subDays($p['startDaysAgo'])->startOfDay();
            $dateTo = $dateFrom->copy()->addDays($p['duration']);
            Rent::create([
                'unit_id' => $unit->id,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'price' => $unit->price * ($p['duration'] + 1),
                'status' => Rent::STATUS_FINISHED,
            ]);
        }

        // Отменённая аренда — на reserved-кладовке (бронь, передумали).
        $reserved = $units->firstWhere('status', Unit::STATUS_RESERVED);
        if ($reserved) {
            $dateFrom = Carbon::now()->subDays(5)->startOfDay();
            $dateTo = $dateFrom->copy()->addDays(30);
            Rent::create([
                'unit_id' => $reserved->id,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
                'price' => $reserved->price * 31,
                'status' => Rent::STATUS_CANCELLED,
            ]);
        }
    }
}
