<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Тип сообщения: 'message' (обычное от пользователя) или 'system_*'
     * (системные события — закрытие/переоткрытие тикета). Системные
     * сообщения отображаются особым стилем в чате и не требуют автора,
     * но мы храним author_id чтобы знать кто закрыл/переоткрыл.
     */
    public function up(): void
    {
        Schema::table('support_messages', function (Blueprint $table) {
            $table->string('type', 32)->default('message')->after('author_id');
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::table('support_messages', function (Blueprint $table) {
            $table->dropIndex(['type']);
            $table->dropColumn('type');
        });
    }
};
