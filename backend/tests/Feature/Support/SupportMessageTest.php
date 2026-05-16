<?php

namespace Tests\Feature\Support;

use App\Models\SupportMessage;
use App\Models\SupportTicket;
use App\Models\User;
use Carbon\Carbon;
use Tests\TestCase;

class SupportMessageTest extends TestCase
{
    public function test_admin_replies_to_manager_ticket(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => SupportTicket::STATUS_OPEN,
        ]);

        $token = $admin->createToken('t')->plainTextToken;
        $this->postJson("/api/v1/support/tickets/{$ticket->id}/messages", [
            'body' => 'Привет, разбираемся',
        ], $this->authHeader($token))->assertStatus(201);

        $this->assertDatabaseHas('support_messages', [
            'ticket_id' => $ticket->id,
            'author_id' => $admin->id,
            'body' => 'Привет, разбираемся',
        ]);

        // Уведомление улетело только владельцу тикета (менеджеру), не админу.
        $this->assertCount(1, $manager->fresh()->notifications);
        $this->assertCount(0, $admin->fresh()->notifications);
    }

    public function test_messages_list_paginates_with_cursor(): void
    {
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => SupportTicket::STATUS_OPEN,
        ]);
        for ($i = 0; $i < 5; $i++) {
            SupportMessage::create([
                'ticket_id' => $ticket->id,
                'author_id' => $manager->id,
                'body' => "msg {$i}",
            ]);
        }

        $token = $manager->createToken('t')->plainTextToken;
        $response = $this->getJson("/api/v1/support/tickets/{$ticket->id}/messages", $this->authHeader($token));
        $response->assertStatus(200)
            ->assertJsonStructure(['data', 'meta' => ['next_cursor', 'has_more']]);
        $this->assertCount(5, $response->json('data'));
    }

    public function test_author_edits_own_message_within_window(): void
    {
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => SupportTicket::STATUS_OPEN,
        ]);
        $message = SupportMessage::create([
            'ticket_id' => $ticket->id,
            'author_id' => $manager->id,
            'body' => 'первый вариант',
        ]);

        $token = $manager->createToken('t')->plainTextToken;
        $this->patchJson("/api/v1/support/messages/{$message->id}", [
            'body' => 'исправил',
        ], $this->authHeader($token))->assertStatus(200);

        $this->assertSame('исправил', $message->fresh()->body);
        $this->assertNotNull($message->fresh()->edited_at);
    }

    public function test_edit_after_window_returns_403(): void
    {
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => SupportTicket::STATUS_OPEN,
        ]);
        $message = SupportMessage::create([
            'ticket_id' => $ticket->id,
            'author_id' => $manager->id,
            'body' => 'старое',
        ]);
        // Принудительно старим сообщение — окно в config — 10 минут.
        $message->forceFill(['created_at' => Carbon::now()->subMinutes(15)])->save();

        $token = $manager->createToken('t')->plainTextToken;
        $this->patchJson("/api/v1/support/messages/{$message->id}", [
            'body' => 'новое',
        ], $this->authHeader($token))->assertStatus(403);
    }

    public function test_only_author_can_edit_own_message(): void
    {
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => SupportTicket::STATUS_OPEN,
        ]);
        $message = SupportMessage::create([
            'ticket_id' => $ticket->id,
            'author_id' => $manager->id,
            'body' => 'мое',
        ]);

        $token = $admin->createToken('t')->plainTextToken;
        $this->patchJson("/api/v1/support/messages/{$message->id}", [
            'body' => 'чужая правка',
        ], $this->authHeader($token))->assertStatus(403);
    }

    public function test_soft_delete_message_hides_body_in_resource(): void
    {
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => SupportTicket::STATUS_OPEN,
        ]);
        $message = SupportMessage::create([
            'ticket_id' => $ticket->id,
            'author_id' => $manager->id,
            'body' => 'секрет',
        ]);

        $token = $manager->createToken('t')->plainTextToken;
        $this->deleteJson("/api/v1/support/messages/{$message->id}", [], $this->authHeader($token))
            ->assertStatus(200);

        $response = $this->getJson("/api/v1/support/tickets/{$ticket->id}/messages", $this->authHeader($token));
        $response->assertStatus(200)
            ->assertJsonPath('data.0.is_deleted', true)
            ->assertJsonPath('data.0.body', null);
    }
}
