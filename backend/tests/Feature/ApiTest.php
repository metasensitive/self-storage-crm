<?php

namespace Tests\Feature;

use App\Models\Container;
use App\Models\Location;
use App\Models\Unit;
use App\Models\Rent;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;
use Illuminate\Support\Facades\Password;

class ApiTest extends TestCase
{
    // Аутентификация

    public function test_user_can_login(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@test.com',
            'password' => Hash::make('password'),
            'role' => User::ROLE_ADMIN,
        ]);

        $response = $this->postJson('/api/v1/auth/login', [
            'email' => 'admin@test.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['user' => ['id', 'email', 'role'], 'token'])
            ->assertJsonPath('user.email', 'admin@test.com');
    }

    public function test_user_can_request_password_reset(): void
    {
        User::factory()->create([
            'email' => 'user@test.com',
            'password' => Hash::make('password'),
        ]);

        $response = $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'user@test.com',
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Если такой пользователь существует, ссылка для сброса отправлена на вашу почту']);
    }

    public function test_user_can_reset_password_with_valid_token(): void
    {
        $user = User::factory()->create([
            'email' => 'user@test.com',
            'password' => Hash::make('password'),
        ]);

        $token = Password::broker()->createToken($user);

        $response = $this->postJson('/api/v1/auth/reset-password', [
            'token' => $token,
            'email' => 'user@test.com',
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);

        $response->assertStatus(200)
            ->assertJson(['message' => 'Пароль успешно изменен. Войдите с новым паролем']);

        $this->assertTrue(Hash::check('NewPassword123!', $user->fresh()->password));
    }

    // Права доступа

    public function test_manager_cannot_create_location(): void
    {
        $response = $this->postJson('/api/v1/locations', [
            'name' => 'Test',
            'city' => 'Test',
            'address' => 'Test Address',
            'latitude' => 55.0,
            'longitude' => 37.0,
            'status' => 'active',
        ], $this->authHeader($this->managerToken()));

        $response->assertStatus(403)
            ->assertJson(['message' => 'Доступ запрещен. Недостаточно прав']);
    }

    public function test_admin_can_create_location(): void
    {
        $token = $this->adminToken();

        $response = $this->postJson('/api/v1/locations', [
            'name' => 'ЖК Тест',
            'city' => 'Москва',
            'address' => 'ул. Тестовая, 1',
            'latitude' => 55.7558,
            'longitude' => 37.6173,
            'status' => 'active',
        ], $this->authHeader($token));

        $response->assertStatus(201)
            ->assertJsonStructure(['message', 'data']);
    }

    // Аренды (бизнес-логика)

    public function test_cannot_create_overlapping_rent(): void
    {
        $token = $this->adminToken();

        $location = Location::factory()->create();
        $container = Container::factory()->create(['location_id' => $location->id]);
        $unit = Unit::factory()->create([
            'container_id' => $container->id,
            'status' => Unit::STATUS_FREE,
            'price' => 300,
        ]);

        // Первая аренда: 1-15 июня
        $this->postJson('/api/v1/rents', [
            'unit_id' => $unit->id,
            'date_from' => '2026-06-01',
            'date_to' => '2026-06-15',
        ], $this->authHeader($token))->assertStatus(201);

        $response = $this->postJson('/api/v1/rents', [
            'unit_id' => $unit->id,
            'date_from' => '2026-06-10',
            'date_to' => '2026-06-25',
        ], $this->authHeader($token));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['unit_id'])
            ->assertJson(['message' => 'Указанная кладовка не существует или недоступна (and 1 more error)']);
    }

    public function test_rent_min_days_validation(): void
    {
        $token = $this->adminToken();

        $location = Location::factory()->create();
        $container = Container::factory()->create(['location_id' => $location->id]);
        $unit = Unit::factory()->create([
            'container_id' => $container->id,
            'status' => Unit::STATUS_FREE,
        ]);

        $response = $this->postJson('/api/v1/rents', [
            'unit_id' => $unit->id,
            'date_from' => '2026-06-01',
            'date_to' => '2026-06-05',
        ], $this->authHeader($token));

        $response->assertStatus(422);
    }

    public function test_creating_rent_calculates_price_correctly(): void
    {
        $token = $this->adminToken();

        $location = Location::factory()->create();
        $container = Container::factory()->create(['location_id' => $location->id]);
        $unit = Unit::factory()->create([
            'container_id' => $container->id,
            'status' => Unit::STATUS_FREE,
            'price' => 300,
        ]);

        $response = $this->postJson('/api/v1/rents', [
            'unit_id' => $unit->id,
            'date_from' => '2026-06-01',
            'date_to' => '2026-06-15', // 15 дней инклюзивно
        ], $this->authHeader($token));

        $response->assertStatus(201);

        $this->assertEqualsWithDelta(4500.0, $response->json('data.price'), 0.01);
    }

    // Аналитика

    public function test_network_analytics_returns_correct_data(): void
    {
        $token = $this->adminToken();

        $location = Location::factory()->create();
        $container = Container::factory()->create(['location_id' => $location->id]);

        Unit::factory(5)->create(['container_id' => $container->id, 'status' => Unit::STATUS_FREE]);
        Unit::factory(3)->create(['container_id' => $container->id, 'status' => Unit::STATUS_RENTED]);
        Unit::factory(2)->create(['container_id' => $container->id, 'status' => Unit::STATUS_BLOCKED]);

        $rentedUnit = Unit::where('status', Unit::STATUS_RENTED)->first();
        Rent::factory()->create([
            'unit_id' => $rentedUnit->id,
            'status' => Rent::STATUS_ACTIVE,
            'price' => 1500.0,
            'created_at' => now(),
        ]);

        $response = $this->getJson('/api/v1/analytics/network', $this->authHeader($token));

        $response->assertStatus(200)
            ->assertJsonStructure([
                'data' => [
                    'total_units', 'free_units', 'rented_units',
                    'occupied_units', 'occupancy_percent', 'monthly_income',
                ],
            ]);

        $this->assertEquals(10, $response->json('data.total_units'));
        $this->assertEquals(5, $response->json('data.free_units'));
        $this->assertEquals(3, $response->json('data.rented_units'));
        $this->assertEquals(1500.0, $response->json('data.monthly_income'));
    }

    public function test_unit_number_auto_generated_when_omitted(): void
    {
        $token = $this->adminToken();
        $location = Location::factory()->create();
        $container = Container::factory()->create(['location_id' => $location->id]);
        // Уже есть кладовки в этом контейнере — №2 и №5.
        Unit::factory()->create(['container_id' => $container->id, 'number' => 2]);
        Unit::factory()->create(['container_id' => $container->id, 'number' => 5]);

        // Создаём без номера — должен сгенерироваться следующий после max (6).
        $response = $this->postJson('/api/v1/units', [
            'container_id' => $container->id,
            'size' => 3.5,
            'price' => 500,
            'status' => 'free',
        ], $this->authHeader($token));

        $response->assertStatus(201);
        $this->assertEquals(6, $response->json('data.number'));
    }
}
