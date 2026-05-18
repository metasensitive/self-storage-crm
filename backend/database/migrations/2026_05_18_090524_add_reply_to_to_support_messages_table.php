<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reply-on-message в чате поддержки.
 *
 * Колонка self-FK на support_messages.id (nullable). При удалении
 * цитируемого сообщения — SET NULL: сама запись reply остаётся живой,
 * просто перестаёт ссылаться на удалённую цитату. Фронт в таком случае
 * покажет «исходное сообщение удалено» вместо превью.
 *
 * Индекс по reply_to_message_id — для редких аналитических запросов
 * «сколько reply у этого сообщения», но в основном для надёжного
 * SET NULL.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_messages', function (Blueprint $table) {
            $table->foreignId('reply_to_message_id')
                ->nullable()
                ->after('author_id')
                ->constrained('support_messages')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('support_messages', function (Blueprint $table) {
            $table->dropForeign(['reply_to_message_id']);
            $table->dropColumn('reply_to_message_id');
        });
    }
};
