<?php

namespace Tests\Feature\Support;

use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class SupportTicketCreationTest extends TestCase
{
    public function test_manager_creates_ticket(): void
    {
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $token = $manager->createToken('t')->plainTextToken;

        $response = $this->postJson('/api/v1/support/tickets', [
            'subject' => 'Не могу попасть в контейнер C-01',
            'body' => 'Замок заел, что делать?',
        ], $this->authHeader($token));

        $response->assertStatus(201)
            ->assertJsonPath('data.subject', 'Не могу попасть в контейнер C-01')
            ->assertJsonPath('data.status', 'open');

        $this->assertDatabaseHas('support_tickets', [
            'manager_id' => $manager->id,
            'subject' => 'Не могу попасть в контейнер C-01',
        ]);
        $this->assertDatabaseHas('support_messages', [
            'author_id' => $manager->id,
            'body' => 'Замок заел, что делать?',
        ]);
    }

    public function test_admin_cannot_create_ticket(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $token = $admin->createToken('t')->plainTextToken;

        $this->postJson('/api/v1/support/tickets', [
            'subject' => 'тест',
            'body' => 'тест',
        ], $this->authHeader($token))->assertStatus(403);
    }

    public function test_guest_cannot_create_ticket(): void
    {
        $this->postJson('/api/v1/support/tickets', [
            'subject' => 'тест',
            'body' => 'тест',
        ])->assertStatus(401);
    }

    public function test_validation_fails_without_subject_and_body(): void
    {
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $token = $manager->createToken('t')->plainTextToken;

        $this->postJson('/api/v1/support/tickets', [], $this->authHeader($token))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['subject', 'body']);
    }

    public function test_creating_ticket_notifies_all_admins(): void
    {
        $admin1 = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $admin2 = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $otherManager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);

        $token = $manager->createToken('t')->plainTextToken;

        $this->postJson('/api/v1/support/tickets', [
            'subject' => 'Помощь',
            'body' => 'Нужна консультация',
        ], $this->authHeader($token))->assertStatus(201);

        $this->assertCount(1, $admin1->fresh()->notifications);
        $this->assertCount(1, $admin2->fresh()->notifications);
        // Уведомление шлётся только админам — другой менеджер ничего не видит.
        $this->assertCount(0, $otherManager->fresh()->notifications);
        // Автор-менеджер тоже не получает уведомление о своём же сообщении.
        $this->assertCount(0, $manager->fresh()->notifications);

        $note = $admin1->fresh()->notifications->first();
        $this->assertSame('support.message', $note->data['type']);
        $this->assertSame($manager->id, $note->data['sender_id']);
    }
}
