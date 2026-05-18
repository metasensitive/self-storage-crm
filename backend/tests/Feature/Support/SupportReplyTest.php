<?php

namespace Tests\Feature\Support;

use App\Models\SupportMessage;
use App\Models\SupportTicket;
use App\Models\User;
use Tests\TestCase;

class SupportReplyTest extends TestCase
{
    public function test_can_reply_to_message_in_same_ticket(): void
    {
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => SupportTicket::STATUS_OPEN,
        ]);
        $original = SupportMessage::create([
            'ticket_id' => $ticket->id,
            'author_id' => $manager->id,
            'body' => 'не работает замок',
        ]);

        $token = $admin->createToken('t')->plainTextToken;
        $response = $this->postJson(
            "/api/v1/support/tickets/{$ticket->id}/messages",
            ['body' => 'попробуй WD-40', 'reply_to_message_id' => $original->id],
            $this->authHeader($token),
        );

        $response->assertStatus(201)
            ->assertJsonPath('data.reply_to.id', $original->id)
            ->assertJsonPath('data.reply_to.author.id', $manager->id)
            ->assertJsonPath('data.reply_to.preview', 'не работает замок');

        $this->assertDatabaseHas('support_messages', [
            'ticket_id' => $ticket->id,
            'author_id' => $admin->id,
            'reply_to_message_id' => $original->id,
        ]);
    }

    public function test_cannot_reply_to_message_from_another_ticket(): void
    {
        $managerA = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $managerB = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $ticketA = SupportTicket::create([
            'manager_id' => $managerA->id,
            'subject' => 'A',
            'status' => 'open',
        ]);
        $ticketB = SupportTicket::create([
            'manager_id' => $managerB->id,
            'subject' => 'B',
            'status' => 'open',
        ]);
        $messageA = SupportMessage::create([
            'ticket_id' => $ticketA->id,
            'author_id' => $managerA->id,
            'body' => 'из тикета A',
        ]);

        $tokenB = $managerB->createToken('t')->plainTextToken;
        // managerB пишет в свой ticketB, но ссылается на сообщение из ticketA
        $this->postJson(
            "/api/v1/support/tickets/{$ticketB->id}/messages",
            ['body' => 'reply', 'reply_to_message_id' => $messageA->id],
            $this->authHeader($tokenB),
        )->assertStatus(422)
            ->assertJsonValidationErrors(['reply_to_message_id']);
    }

    public function test_cannot_reply_to_system_message(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => 'open',
        ]);
        $sys = SupportMessage::create([
            'ticket_id' => $ticket->id,
            'author_id' => $admin->id,
            'type' => SupportMessage::TYPE_SYSTEM_CLOSED,
            'body' => null,
        ]);

        $token = $admin->createToken('t')->plainTextToken;
        $this->postJson(
            "/api/v1/support/tickets/{$ticket->id}/messages",
            ['body' => 'reply', 'reply_to_message_id' => $sys->id],
            $this->authHeader($token),
        )->assertStatus(422)
            ->assertJsonValidationErrors(['reply_to_message_id']);
    }

    public function test_cannot_reply_to_deleted_message(): void
    {
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => 'open',
        ]);
        $original = SupportMessage::create([
            'ticket_id' => $ticket->id,
            'author_id' => $manager->id,
            'body' => 'будет удалено',
        ]);
        $original->delete();

        $token = $admin->createToken('t')->plainTextToken;
        $this->postJson(
            "/api/v1/support/tickets/{$ticket->id}/messages",
            ['body' => 'reply', 'reply_to_message_id' => $original->id],
            $this->authHeader($token),
        )->assertStatus(422)
            ->assertJsonValidationErrors(['reply_to_message_id']);
    }

    public function test_reply_loaded_in_messages_index(): void
    {
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => 'open',
        ]);
        $original = SupportMessage::create([
            'ticket_id' => $ticket->id,
            'author_id' => $manager->id,
            'body' => 'оригинал',
        ]);
        SupportMessage::create([
            'ticket_id' => $ticket->id,
            'author_id' => $admin->id,
            'body' => 'ответ',
            'reply_to_message_id' => $original->id,
        ]);

        $token = $manager->createToken('t')->plainTextToken;
        $response = $this->getJson(
            "/api/v1/support/tickets/{$ticket->id}/messages",
            $this->authHeader($token),
        );
        $response->assertStatus(200);

        // API отдаёт desc — новые сверху, поэтому reply на индексе 0
        $response->assertJsonPath('data.0.reply_to.id', $original->id)
            ->assertJsonPath('data.0.reply_to.preview', 'оригинал');
        // Оригинал на индексе 1 — reply_to не должно быть в поле
        $this->assertArrayNotHasKey('reply_to', $response->json('data.1'));
    }

    public function test_reply_to_deleted_original_shows_as_deleted(): void
    {
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => 'open',
        ]);
        $original = SupportMessage::create([
            'ticket_id' => $ticket->id,
            'author_id' => $manager->id,
            'body' => 'будет удалено',
        ]);
        SupportMessage::create([
            'ticket_id' => $ticket->id,
            'author_id' => $admin->id,
            'body' => 'ответ',
            'reply_to_message_id' => $original->id,
        ]);
        // Удаляем оригинал ПОСЛЕ создания reply
        $original->delete();

        $token = $manager->createToken('t')->plainTextToken;
        $response = $this->getJson(
            "/api/v1/support/tickets/{$ticket->id}/messages",
            $this->authHeader($token),
        );
        $response->assertStatus(200)
            ->assertJsonPath('data.0.reply_to.id', $original->id)
            ->assertJsonPath('data.0.reply_to.is_deleted', true)
            ->assertJsonPath('data.0.reply_to.preview', null);
    }
}
