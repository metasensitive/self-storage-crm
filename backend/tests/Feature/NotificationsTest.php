<?php

namespace Tests\Feature;

use App\Models\Container;
use App\Models\Location;
use App\Models\Unit;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class NotificationsTest extends TestCase
{
    public function test_creating_rent_notifies_all_staff_including_actor(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@test.com',
            'password' => Hash::make('p'),
            'role' => User::ROLE_ADMIN,
        ]);
        $manager = User::factory()->create([
            'email' => 'manager@test.com',
            'password' => Hash::make('p'),
            'role' => User::ROLE_MANAGER,
        ]);
        $otherManager = User::factory()->create([
            'role' => User::ROLE_MANAGER,
        ]);

        $location = Location::factory()->create();
        $container = Container::factory()->create(['location_id' => $location->id]);
        $unit = Unit::factory()->create([
            'container_id' => $container->id,
            'status' => Unit::STATUS_FREE,
            'price' => 300,
        ]);

        $managerToken = $manager->createToken('t')->plainTextToken;

        $this->postJson('/api/v1/rents', [
            'unit_id' => $unit->id,
            'date_from' => '2026-06-01',
            'date_to' => '2026-06-15',
        ], $this->authHeader($managerToken))->assertStatus(201);

        // Создатель тоже получает уведомление — это его «история действий»
        // (особенно важно для менеджеров без доступа к аудит-логу).
        $this->assertCount(1, $manager->fresh()->notifications);
        $this->assertCount(1, $admin->fresh()->notifications);
        $this->assertCount(1, $otherManager->fresh()->notifications);

        $note = $admin->fresh()->notifications->first();
        $this->assertSame('rent.created', $note->data['type']);
        $this->assertSame($manager->id, $note->data['actor_id']);
    }

    public function test_creating_location_notifies_all_staff(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);

        $token = $admin->createToken('t')->plainTextToken;

        $this->postJson('/api/v1/locations', [
            'name' => 'ЖК Тест',
            'city' => 'Москва',
            'address' => 'ул. Тестовая, 1',
            'latitude' => 55.7,
            'longitude' => 37.6,
            'status' => 'active',
        ], $this->authHeader($token))->assertStatus(201);

        $this->assertCount(1, $admin->fresh()->notifications);
        $this->assertCount(1, $manager->fresh()->notifications);
        $this->assertSame('location.created', $admin->fresh()->notifications->first()->data['type']);
    }

    public function test_creating_unit_notifies_all_staff(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);

        $location = Location::factory()->create();
        $container = Container::factory()->create(['location_id' => $location->id]);

        $token = $admin->createToken('t')->plainTextToken;

        $this->postJson('/api/v1/units', [
            'container_id' => $container->id,
            'number' => 42,
            'size' => 5.5,
            'price' => 1500,
            'status' => 'free',
        ], $this->authHeader($token))->assertStatus(201);

        $this->assertCount(1, $admin->fresh()->notifications);
        $this->assertCount(1, $manager->fresh()->notifications);
        $this->assertSame('unit.created', $admin->fresh()->notifications->first()->data['type']);
    }

    public function test_user_lists_own_notifications(): void
    {
        $token = $this->adminToken();
        $response = $this->getJson('/api/v1/notifications', $this->authHeader($token));
        $response->assertStatus(200)
            ->assertJsonStructure(['data', 'meta' => ['unread_count']]);
    }

    public function test_mark_all_read(): void
    {
        $user = User::factory()->create(['role' => User::ROLE_ADMIN]);
        // Создадим вручную пару уведомлений
        $user->notifications()->create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'type' => 'App\\Notifications\\Test',
            'data' => ['type' => 'test', 'msg' => 'hello'],
        ]);
        $user->notifications()->create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'type' => 'App\\Notifications\\Test',
            'data' => ['type' => 'test', 'msg' => 'world'],
        ]);

        $token = $user->createToken('t')->plainTextToken;
        $this->assertSame(2, $user->fresh()->unreadNotifications()->count());

        $this->postJson('/api/v1/notifications/read-all', [], $this->authHeader($token))
            ->assertStatus(200);

        $this->assertSame(0, $user->fresh()->unreadNotifications()->count());
    }

    public function test_guest_cannot_access_notifications(): void
    {
        $this->getJson('/api/v1/notifications')->assertStatus(401);
    }
}
