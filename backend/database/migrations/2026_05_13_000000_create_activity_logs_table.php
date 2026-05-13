<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            // created / updated / deleted (+ возможные кастомные действия в будущем)
            $table->string('action', 32)->index();
            // Полный FQCN: "App\Models\Location" — храним как есть, мапим на фронте.
            $table->string('subject_type', 100);
            $table->unsignedBigInteger('subject_id');
            // Человеко-читаемое имя объекта на момент действия — нужно когда
            // субъект удалён и связь по subject_id больше ничего не вернёт.
            $table->string('subject_label', 255)->nullable();
            $table->json('changes')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['subject_type', 'subject_id']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
