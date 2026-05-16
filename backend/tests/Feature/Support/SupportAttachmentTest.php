<?php

namespace Tests\Feature\Support;

use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SupportAttachmentTest extends TestCase
{
    public function test_message_with_image_attachment_is_stored(): void
    {
        Storage::fake('local');

        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => 'open',
        ]);

        $token = $manager->createToken('t')->plainTextToken;
        $file = UploadedFile::fake()->image('photo.jpg', 800, 600);

        $response = $this->post(
            "/api/v1/support/tickets/{$ticket->id}/messages",
            ['body' => 'смотри', 'attachments' => [$file]],
            $this->authHeader($token),
        );

        $response->assertStatus(201);
        $this->assertDatabaseCount('support_attachments', 1);
        $attachment = \App\Models\SupportAttachment::first();
        Storage::disk('local')->assertExists($attachment->path);
        $this->assertSame('photo.jpg', $attachment->original_name);
    }

    public function test_unauthorized_user_cannot_download(): void
    {
        Storage::fake('local');

        $managerA = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $managerB = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $ticket = SupportTicket::create([
            'manager_id' => $managerA->id,
            'subject' => 'тест',
            'status' => 'open',
        ]);

        $this->actingAs($managerA, 'sanctum');
        $this->post("/api/v1/support/tickets/{$ticket->id}/messages", [
            'attachments' => [UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf')],
        ])->assertStatus(201);

        $attachment = \App\Models\SupportAttachment::first();

        $this->actingAs($managerB, 'sanctum');
        $this->getJson("/api/v1/support/attachments/{$attachment->id}/download")
            ->assertStatus(404);
    }

    public function test_invalid_mime_rejected(): void
    {
        Storage::fake('local');

        $manager = User::factory()->create(['role' => User::ROLE_MANAGER]);
        $ticket = SupportTicket::create([
            'manager_id' => $manager->id,
            'subject' => 'тест',
            'status' => 'open',
        ]);

        $token = $manager->createToken('t')->plainTextToken;
        $bad = UploadedFile::fake()->create('script.exe', 10, 'application/x-msdownload');

        $this->post("/api/v1/support/tickets/{$ticket->id}/messages", [
            'body' => 'тест',
            'attachments' => [$bad],
        ], $this->authHeader($token))->assertStatus(422)
            ->assertJsonValidationErrors(['attachments.0']);
    }
}
