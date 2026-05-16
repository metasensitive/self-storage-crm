<?php

namespace Tests\Feature\Support;

use App\Models\SupportMessage;
use App\Models\SupportTicket;
use App\Models\User;
use Tests\TestCase;

class SupportSearchTest extends TestCase
{
    public function test_admin_search_across_all_tickets(): void
    {
        $admin = User::factory()->create(['role' => User::ROLE_ADMIN]);
        $m1 = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $m2 = User::factory()->create(['role' => User::ROLE_MANAGER]);

        $t1 = SupportTicket::create(['manager_id' => $m1->id, 'subject' => 's', 'status' => 'open']);
        $t2 = SupportTicket::create(['manager_id' => $m2->id, 'subject' => 's', 'status' => 'open']);

        SupportMessage::create(['ticket_id' => $t1->id, 'author_id' => $m1->id, 'body' => 'замок сломан']);
        SupportMessage::create(['ticket_id' => $t2->id, 'author_id' => $m2->id, 'body' => 'тоже замок не работает']);
        SupportMessage::create(['ticket_id' => $t1->id, 'author_id' => $m1->id, 'body' => 'спасибо за помощь']);

        $token = $admin->createToken('t')->plainTextToken;
        $response = $this->getJson('/api/v1/support/search?q=замок', $this->authHeader($token));
        $response->assertStatus(200);
        $this->assertCount(2, $response->json('data'));
    }

    public function test_manager_search_only_in_own_tickets(): void
    {
        $m1 = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $m2 = User::factory()->create(['role' => User::ROLE_MANAGER]);

        $t1 = SupportTicket::create(['manager_id' => $m1->id, 'subject' => 's', 'status' => 'open']);
        $t2 = SupportTicket::create(['manager_id' => $m2->id, 'subject' => 's', 'status' => 'open']);

        SupportMessage::create(['ticket_id' => $t1->id, 'author_id' => $m1->id, 'body' => 'замок свой']);
        SupportMessage::create(['ticket_id' => $t2->id, 'author_id' => $m2->id, 'body' => 'замок чужой']);

        $token = $m1->createToken('t')->plainTextToken;
        $response = $this->getJson('/api/v1/support/search?q=замок', $this->authHeader($token));
        $this->assertCount(1, $response->json('data'));
    }
}
