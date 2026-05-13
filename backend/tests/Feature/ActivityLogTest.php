<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Location;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    public function test_guest_cannot_view_activity_logs(): void
    {
        $this->getJson('/api/v1/activity-logs')->assertStatus(401);
    }

    public function test_manager_cannot_view_activity_logs(): void
    {
        $this->getJson('/api/v1/activity-logs', $this->authHeader($this->managerToken()))
            ->assertStatus(403);
    }

    public function test_admin_can_view_activity_logs(): void
    {
        $token = $this->adminToken();
        $this->getJson('/api/v1/activity-logs', $this->authHeader($token))->assertStatus(200);
    }

    public function test_location_create_is_logged(): void
    {
        $token = $this->adminToken();

        $this->postJson('/api/v1/locations', [
            'name' => 'ЖК Маяк',
            'city' => 'Москва',
            'address' => 'ул. Тестовая, 1',
            'latitude' => 55.7558,
            'longitude' => 37.6173,
            'status' => 'active',
        ], $this->authHeader($token))->assertStatus(201);

        $log = ActivityLog::where('subject_type', Location::class)
            ->where('action', 'created')
            ->first();
        $this->assertNotNull($log);
        $this->assertSame('ЖК Маяк', $log->subject_label);
        $this->assertArrayHasKey('new', $log->changes);
        $this->assertSame('ЖК Маяк', $log->changes['new']['name']);
    }

    public function test_location_update_logs_diff_only(): void
    {
        $token = $this->adminToken();
        $location = Location::create([
            'name' => 'Старое имя',
            'city' => 'Москва',
            'address' => 'ул. Тестовая, 1',
            'latitude' => 55.0,
            'longitude' => 37.0,
            'status' => 'active',
        ]);

        $this->putJson("/api/v1/locations/{$location->id}", [
            'name' => 'Новое имя',
            'city' => $location->city,
            'address' => $location->address,
            'latitude' => $location->latitude,
            'longitude' => $location->longitude,
            'status' => $location->status,
        ], $this->authHeader($token))->assertStatus(200);

        $log = ActivityLog::where('subject_type', Location::class)
            ->where('subject_id', $location->id)
            ->where('action', 'updated')
            ->first();
        $this->assertNotNull($log);
        $this->assertSame('Старое имя', $log->changes['old']['name']);
        $this->assertSame('Новое имя', $log->changes['new']['name']);
        // city не менялся — в diff его быть не должно
        $this->assertArrayNotHasKey('city', $log->changes['new']);
    }

    public function test_location_delete_is_logged_with_old_snapshot(): void
    {
        $token = $this->adminToken();
        $location = Location::create([
            'name' => 'Удаляемая',
            'city' => 'Москва',
            'address' => 'ул. Тестовая, 1',
            'latitude' => 55.0,
            'longitude' => 37.0,
            'status' => 'active',
        ]);

        $this->deleteJson("/api/v1/locations/{$location->id}", [], $this->authHeader($token))
            ->assertStatus(200);

        $log = ActivityLog::where('subject_type', Location::class)
            ->where('subject_id', $location->id)
            ->where('action', 'deleted')
            ->first();
        $this->assertNotNull($log);
        $this->assertSame('Удаляемая', $log->subject_label);
        $this->assertSame('Удаляемая', $log->changes['old']['name']);
    }

    public function test_filter_by_subject_type(): void
    {
        $token = $this->adminToken();
        $this->postJson('/api/v1/locations', [
            'name' => 'Фильтр',
            'city' => 'Москва',
            'address' => 'ул. Тестовая, 1',
            'latitude' => 55,
            'longitude' => 37,
            'status' => 'active',
        ], $this->authHeader($token))->assertStatus(201);

        $response = $this->getJson('/api/v1/activity-logs?subject_type=Location', $this->authHeader($token));
        $response->assertStatus(200);
        foreach ($response->json('data') as $item) {
            $this->assertSame('Location', $item['subject_type']);
        }
    }

    public function test_password_is_not_logged(): void
    {
        $token = $this->adminToken();

        $this->postJson('/api/v1/users', [
            'name' => 'Новый менеджер',
            'email' => 'new@test.com',
            'password' => 'SecretPassword123!',
            'role' => 'manager',
        ], $this->authHeader($token))->assertStatus(201);

        $log = ActivityLog::where('subject_type', \App\Models\User::class)
            ->where('action', 'created')
            ->latest('id')
            ->first();
        $this->assertNotNull($log);
        $this->assertArrayNotHasKey('password', $log->changes['new']);
    }
}
