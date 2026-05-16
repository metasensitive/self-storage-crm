<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Отдельная таблица — а не флаг is_read на сообщении — потому что у одного
        // сообщения может быть несколько получателей (например, несколько админов
        // читают сообщение менеджера). Каждый отмечается индивидуально.
        Schema::create('support_message_reads', function (Blueprint $table) {
            $table->foreignId('message_id')->constrained('support_messages')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestampTz('read_at')->useCurrent();

            $table->primary(['message_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_message_reads');
    }
};
