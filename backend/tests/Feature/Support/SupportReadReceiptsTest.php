<?php

namespace Tests\Feature\Support;

use App\Models\SupportMessage;
use App\Models\SupportMessageRead;
use App\Models\SupportTicket;
use App\Models\User;
use Tests\TestCase;

class SupportReadReceiptsTest extends TestCase
{
    public function test_mark_read_creates_rows_only_for_others_messages(): void
    {
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => 'open',
        ]);

        // 2 сообщения от менеджера + 1 от админа.
        SupportMessage::create(['ticket_id' => $ticket->id, 'author_id' => $manager->id, 'body' => 'm1']);
        SupportMessage::create(['ticket_id' => $ticket->id, 'author_id' => $manager->id, 'body' => 'm2']);
        SupportMessage::create(['ticket_id' => $ticket->id, 'author_id' => $admin->id, 'body' => 'a1']);

        $token = $manager->createToken('t')->plainTextToken;
        $response = $this->postJson("/api/v1/support/tickets/{$ticket->id}/read", [], $this->authHeader($token));

        $response->assertStatus(200);
        // Менеджер прочитал только 1 чужое сообщение — два своих не считаются.
        $this->assertSame(1, $response->json('data.marked'));
        $this->assertSame(1, SupportMessageRead::where('user_id', $manager->id)->count());
    }

    public function test_mark_read_is_idempotent(): void
    {
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => 'open',
        ]);
        SupportMessage::create(['ticket_id' => $ticket->id, 'author_id' => $admin->id, 'body' => 'a1']);

        $token = $manager->createToken('t')->plainTextToken;
        $this->postJson("/api/v1/support/tickets/{$ticket->id}/read", [], $this->authHeader($token))->assertStatus(200);
        $this->postJson("/api/v1/support/tickets/{$ticket->id}/read", [], $this->authHeader($token))
            ->assertStatus(200)
            ->assertJsonPath('data.marked', 0);

        $this->assertSame(1, SupportMessageRead::count());
    }

    public function test_unread_count_endpoint(): void
    {
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => 'open',
        ]);
        SupportMessage::create(['ticket_id' => $ticket->id, 'author_id' => $admin->id, 'body' => 'a1']);
        SupportMessage::create(['ticket_id' => $ticket->id, 'author_id' => $admin->id, 'body' => 'a2']);

        $token = $manager->createToken('t')->plainTextToken;
        $this->getJson('/api/v1/support/unread-count', $this->authHeader($token))
            ->assertStatus(200)
            ->assertJsonPath('data.unread', 2);
    }
}
