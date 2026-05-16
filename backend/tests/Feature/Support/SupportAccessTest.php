<?php

namespace Tests\Feature\Support;

use App\Models\SupportTicket;
use App\Models\User;
use Tests\TestCase;

class SupportAccessTest extends TestCase
{
    public function test_manager_cannot_see_other_managers_ticket(): void
    {
        $managerA = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $managerB = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $ticket = SupportTicket::create([
            'manager_id' => $managerB->id,
            'subject' => 'чужой',
            'status' => SupportTicket::STATUS_OPEN,
        ]);

        $token = $managerA->createToken('t')->plainTextToken;
        $this->getJson("/api/v1/support/tickets/{$ticket->id}", $this->authHeader($token))
            ->assertStatus(404);
    }

    public function test_manager_index_shows_only_own_tickets(): void
    {
        $managerA = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $managerB = User::factory()->create(['role' => User::ROLE_MANAGER]);

        SupportTicket::create(['manager_id' => $managerA->id, 'subject' => 'мой 1', 'status' => 'open']);
        SupportTicket::create(['manager_id' => $managerA->id, 'subject' => 'мой 2', 'status' => 'open']);
        SupportTicket::create(['manager_id' => $managerB->id, 'subject' => 'чужой', 'status' => 'open']);

        $token = $managerA->createToken('t')->plainTextToken;
        $response = $this->getJson('/api/v1/support/tickets', $this->authHeader($token));
        $response->assertStatus(200);
        $this->assertSame(2, $response->json('meta.total'));
    }

    public function test_admin_sees_all_tickets(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $managerA = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $managerB = User::factory()->create(['role' => User::ROLE_MANAGER]);

        SupportTicket::create(['manager_id' => $managerA->id, 'subject' => '1', 'status' => 'open']);
        SupportTicket::create(['manager_id' => $managerB->id, 'subject' => '2', 'status' => 'open']);

        $token = $admin->createToken('t')->plainTextToken;
        $response = $this->getJson('/api/v1/support/tickets', $this->authHeader($token));
        $this->assertSame(2, $response->json('meta.total'));
    }

    public function test_guest_blocked(): void
    {
        $this->getJson('/api/v1/support/tickets')->assertStatus(401);
    }
}
