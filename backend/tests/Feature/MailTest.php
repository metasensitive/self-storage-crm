<?php

namespace Tests\Feature;

use App\Mail\ResetPasswordMail;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

/**
 * Smoke-тест отправки email — гарантирует что Laravel правильно собирает
 * Mailable и не падает на рендере шаблона. Реальный SMTP не дёргается:
 * Mail::fake() перехватывает send() локально.
 *
 * Полезно для CI/локального прогона без MAIL-кредов в .env.testing.
 */
class MailTest extends TestCase
{
    public function test_forgot_password_dispatches_reset_email(): void
    {
        Mail::fake();

        User::factory()->create([
            'email' => 'user@test.com',
            'password' => Hash::make('password'),
        ]);

        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'user@test.com',
        ])->assertStatus(200);

        Mail::assertSent(ResetPasswordMail::class, function (ResetPasswordMail $mail) {
            return $mail->hasTo('user@test.com');
        });
    }

    public function test_forgot_password_does_not_send_for_unknown_email(): void
    {
        Mail::fake();

        // Неизвестный адрес → бэк возвращает 200 (анти-перебор), но писем
        // не отправляет. Проверяем именно отсутствие отправки.
        $this->postJson('/api/v1/auth/forgot-password', [
            'email' => 'nobody@test.com',
        ])->assertStatus(200);

        Mail::assertNothingSent();
    }
}
