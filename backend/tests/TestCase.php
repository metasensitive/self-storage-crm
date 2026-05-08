<?php

namespace Tests;

use App\Models\User;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;

    protected function adminToken(): string
    {
        $admin = User::factory()->create([
            'email' => 'admin@test.com',
            'password' => Hash::make('password'),
            'role' => User::ROLE_ADMIN,
        ]);

        return $admin->createToken('test-token')->plainTextToken;
    }

    protected function managerToken(): string
    {
        $manager = User::factory()->create([
            'email' => 'manager@test.com',
            'password' => Hash::make('password'),
            'role' => User::ROLE_MANAGER,
        ]);

        return $manager->createToken('test-token')->plainTextToken;
    }

    protected function authHeader(string $token, array $extra = []): array
    {
        return array_merge([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ], $extra);
    }

    protected function guestHeader(): array
    {
        return ['Accept' => 'application/json'];
    }
}
