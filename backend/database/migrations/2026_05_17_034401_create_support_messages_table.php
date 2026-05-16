<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained('support_tickets')->cascadeOnDelete();
            // Автор сообщения; restrict — историю переписки нельзя терять при
            // случайном удалении user'а, сначала разруливаем тикет.
            $table->foreignId('author_id')->constrained('users')->restrictOnDelete();
            // body — nullable: сообщение может быть «только вложения, без текста».
            $table->text('body')->nullable();
            $table->timestampTz('edited_at')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['ticket_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_messages');
    }
};
