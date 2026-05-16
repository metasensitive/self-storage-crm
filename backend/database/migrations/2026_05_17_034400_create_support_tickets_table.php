<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->id();
            // Менеджер-владелец тикета. На удаление пользователя сносим тикет —
            // переписку без автора с одной стороны хранить смысла нет.
            $table->foreignId('manager_id')->constrained('users')->cascadeOnDelete();
            $table->string('subject', 255);
            // open / closed — статус тикета. Строкой, как в остальных моделях
            // проекта (Rent, Container, Unit), без enum.
            $table->string('status', 16)->default('open');
            // Денормализованные поля для быстрого списка тикетов: не делаем
            // отдельный JOIN на последнее сообщение для каждой строки списка.
            $table->timestampTz('last_message_at')->nullable();
            $table->string('last_message_preview', 280)->nullable();
            $table->timestampTz('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('manager_id');
            $table->index(['status', 'last_message_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_tickets');
    }
};
