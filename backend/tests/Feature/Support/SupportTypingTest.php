<?php

namespace Tests\Feature\Support;

use App\Events\Support\SupportTyping;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class SupportTypingTest extends TestCase
{
    public function test_typing_endpoint_broadcasts_event(): void
    {
        Event::fake();

        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => SupportTicket::STATUS_OPEN,
        ]);

        $token = $manager->createToken('t')->plainTextToken;
        $this->postJson(
            "/api/v1/support/tickets/{$ticket->id}/typing",
            [],
            $this->authHeader($token),
        )->assertStatus(204);

        Event::assertDispatched(SupportTyping::class, function ($e) use ($ticket, $manager) {
            return $e->ticketId === $ticket->id && $e->userId === $manager->id;
        });
    }

    public function test_other_manager_cannot_signal_typing_in_foreign_ticket(): void
    {
        Event::fake();

        $m1 = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $m2 = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $ticket = SupportTicket::create([
            'manager_id' => $m1->id,
            'subject' => 'тест',
            'status' => SupportTicket::STATUS_OPEN,
        ]);

        $token = $m2->createToken('t')->plainTextToken;
        $this->postJson(
            "/api/v1/support/tickets/{$ticket->id}/typing",
            [],
            $this->authHeader($token),
        )->assertStatus(404);

        Event::assertNotDispatched(SupportTyping::class);
    }

    public function test_typing_on_closed_ticket_is_noop(): void
    {
        Event::fake();

        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => SupportTicket::STATUS_CLOSED,
        ]);

        $token = $manager->createToken('t')->plainTextToken;
        $this->postJson(
            "/api/v1/support/tickets/{$ticket->id}/typing",
            [],
            $this->authHeader($token),
        )->assertStatus(204);

        Event::assertNotDispatched(SupportTyping::class);
    }

    public function test_guest_blocked(): void
    {
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => SupportTicket::STATUS_OPEN,
        ]);
        $this->postJson("/api/v1/support/tickets/{$ticket->id}/typing")->assertStatus(401);
    }
}
