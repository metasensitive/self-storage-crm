<?php

namespace Tests\Feature\Support;

use App\Models\SupportTicket;
use App\Models\User;
use Tests\TestCase;

class SupportTicketStatusTest extends TestCase
{
    public function test_admin_closes_and_reopens_ticket(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => 'open',
        ]);

        $token = $admin->createToken('t')->plainTextToken;

        $this->patchJson("/api/v1/support/tickets/{$ticket->id}/status", [
            'status' => 'closed',
        ], $this->authHeader($token))->assertStatus(200)
            ->assertJsonPath('data.status', 'closed')
            ->assertJsonPath('data.is_closed', true);

        $this->assertNotNull($ticket->fresh()->closed_at);
        $this->assertSame($admin->id, $ticket->fresh()->closed_by);

        $this->patchJson("/api/v1/support/tickets/{$ticket->id}/status", [
            'status' => 'open',
        ], $this->authHeader($token))->assertStatus(200)
            ->assertJsonPath('data.status', 'open')
            ->assertJsonPath('data.is_closed', false);

        $this->assertNull($ticket->fresh()->closed_at);
    }

    public function test_closed_ticket_rejects_new_messages(): void
    {
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => SupportTicket::STATUS_CLOSED,
        ]);

        $token = $manager->createToken('t')->plainTextToken;
        $this->postJson("/api/v1/support/tickets/{$ticket->id}/messages", [
            'body' => 'привет',
        ], $this->authHeader($token))->assertStatus(422);
    }
}
