<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Меняем все timestamptz-колонки чата поддержки на обычный timestamp.
 *
 * Корневая причина бага: остальные таблицы проекта используют plain
 * `timestamp` (через `$table->timestamps()`), а я в первой версии модуля
 * завёл `last_message_at`/`closed_at`/`edited_at`/`read_at` как `timestampTz`.
 *
 * Что ломалось:
 *   - Laravel биндит Carbon-значение в PDO как строку «Y-m-d H:i:s» без
 *     TZ-суффикса.
 *   - Если у PostgreSQL session TZ ≠ UTC (напр. на dev-машине Asia/Omsk),
 *     PG интерпретирует эту строку как локальное время и пересчитывает
 *     в UTC при записи в timestamptz → значение оказывается сдвинутым
 *     на смещение TZ относительно plain-timestamp `created_at`.
 *   - Следствие: в списке тикетов время отображалось со сдвигом, а
 *     внутри чата (где created_at — plain) корректно.
 *
 * USING (col AT TIME ZONE current_setting('TimeZone')) — извлекает плоское
 * представление TZ-aware значения в текущей TZ сессии. На той же машине,
 * где данные были записаны, это даёт wall-clock время пользователя без
 * сдвига и тем самым «восстанавливает» правильное визуальное время.
 *
 * Дополнительно пересчитываем last_message_at из реального последнего
 * сообщения — гарантирует синк независимо от того, как конкретно
 * USING-конвертация ушла.
 */
return new class extends Migration
{
    public function up(): void
    {
        $tz = "current_setting('TimeZone')";

        DB::statement("ALTER TABLE support_tickets ALTER COLUMN last_message_at TYPE timestamp USING last_message_at AT TIME ZONE $tz");
        DB::statement("ALTER TABLE support_tickets ALTER COLUMN closed_at TYPE timestamp USING closed_at AT TIME ZONE $tz");
        DB::statement("ALTER TABLE support_messages ALTER COLUMN edited_at TYPE timestamp USING edited_at AT TIME ZONE $tz");
        DB::statement("ALTER TABLE support_message_reads ALTER COLUMN read_at TYPE timestamp USING read_at AT TIME ZONE $tz");

        // Подстраховка: пересчитываем last_message_at из последнего
        // не-удалённого сообщения тикета. created_at у сообщений всегда
        // plain timestamp и не пострадал от бага.
        DB::statement(<<<'SQL'
UPDATE support_tickets t
SET last_message_at = m.created_at
FROM (
    SELECT DISTINCT ON (ticket_id) ticket_id, created_at
    FROM support_messages
    WHERE deleted_at IS NULL
    ORDER BY ticket_id, id DESC
) m
WHERE t.id = m.ticket_id
SQL);
    }

    public function down(): void
    {
        $tz = "current_setting('TimeZone')";

        DB::statement("ALTER TABLE support_tickets ALTER COLUMN last_message_at TYPE timestamptz USING last_message_at AT TIME ZONE $tz");
        DB::statement("ALTER TABLE support_tickets ALTER COLUMN closed_at TYPE timestamptz USING closed_at AT TIME ZONE $tz");
        DB::statement("ALTER TABLE support_messages ALTER COLUMN edited_at TYPE timestamptz USING edited_at AT TIME ZONE $tz");
        DB::statement("ALTER TABLE support_message_reads ALTER COLUMN read_at TYPE timestamptz USING read_at AT TIME ZONE $tz");
    }
};
