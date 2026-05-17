<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Индекс на support_message_reads(user_id) — для подзапросов вида
 * `select message_id from support_message_reads where user_id = X`.
 *
 * Такой подзапрос крутится в:
 *  - SupportTicket::unreadCountFor (одиночные тикеты)
 *  - withCount('messages as unread_count') в SupportTicketController::index
 *    (выполняется как коррелированный SELECT-подзапрос для КАЖДОЙ строки
 *    основного select'а с tickets — без подходящего индекса это full scan
 *    leaf-level первичного ключа на каждой итерации).
 *
 * PK у таблицы — (message_id, user_id), т. е. он не отвечает на
 * «select message_id where user_id = X» без полного сканирования.
 * Этот индекс делает такой WHERE точечным index-lookup'ом + позволяет
 * index-only scan (`SELECT message_id` уже в индексе).
 *
 * Имя индекса фиксируем явно — PG-имена auto-generated не всегда
 * предсказуемы, а явное имя облегчает down() и анализ EXPLAIN.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('support_message_reads', function (Blueprint $table) {
            $table->index(['user_id', 'message_id'], 'support_message_reads_user_id_message_id_index');
        });
    }

    public function down(): void
    {
        Schema::table('support_message_reads', function (Blueprint $table) {
            $table->dropIndex('support_message_reads_user_id_message_id_index');
        });
    }
};
