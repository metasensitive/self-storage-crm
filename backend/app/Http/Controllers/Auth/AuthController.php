<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ForgotPasswordRequest;
use App\Http\Requests\Auth\ResetPasswordRequest;
use App\Mail\ResetPasswordMail;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    /**
     * Вход в систему.
     *
     * Возвращает токен Sanctum для дальнейшей авторизации.
     *
     * @tags Аутентификация
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Неверный email или пароль'
            ], 401);
        }

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar_url' => $user->avatar_url
            ],
            'token' => $token
        ]);
    }

    /**
     * Выход из системы.
     *
     * Удаляет текущий токен доступа.
     *
     * @tags Аутентификация
     */

    public function logout(): JsonResponse
    {
        request()->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Вы вышли из системы'
        ]);
    }

    /**
     * Запрос на восстановление пароля.
     *
     * Отправляет письмо со ссылкой для сброса пароля на указанный email.
     *
     * @tags Аутентификация
     */

    public function forgotPassword(ForgotPasswordRequest $request): JsonResponse
    {
        $email = $request->email;
        $user = User::where('email', $email)->first();

        if ($user) {
            $plainToken = Str::random(64);
            $hashedToken = Hash::make($plainToken);

            DB::table('password_reset_tokens')->where('email', $email)->delete();

            DB::table('password_reset_tokens')->insert([
                'email' => $email,
                'token' => $hashedToken,
                'created_at' => now(),
            ]);

            Mail::to($user->email)->send(new ResetPasswordMail($plainToken, $email));
        }

        return response()->json([
            'message' => 'Если такой пользователь существует, ссылка для сброса отправлена на вашу почту'
        ], 200);
    }

    /**
     * Сброс пароля.
     *
     * Устанавливает новый пароль по токену из письма.
     *
     * @tags Аутентификация
     */

    public function resetPassword(ResetPasswordRequest $request): JsonResponse
    {
        $email = $request->email;
        $plainToken = $request->token;

        $resetRecord = DB::table('password_reset_tokens')
            ->where('email', $email)
            ->first();

        // проверка записи
        if (!$resetRecord) {
            return response()->json([
                'message' => 'Неверный токен сброса пароля'
            ], 400);
        }
        // проверка срока действия ссылки
        if (now()->diffInMinutes($resetRecord->created_at) > 60) {
            DB::table('password_reset_tokens')->where('email', $email)->delete();
            return response()->json([
                'message' => 'Срок действия ссылки истёк. Запросите новый сброс пароля'
            ], 400);
        }
        // проверка токена
        if (!Hash::check($plainToken, $resetRecord->token)) {
            return response()->json([
                'message' => 'Неверный токен сброса пароля'
            ], 400);
        }

        // пароль автоматически хешируется благодаря касту 'hashed' в модели User
        $user = User::where('email', $email)->first();
        $user->password = $request->password;
        $user->save();

        $user->tokens()->delete();

        DB::table('password_reset_tokens')->where('email', $email)->delete();

        return response()->json([
            'message' => 'Пароль успешно изменен. Войдите с новым паролем'
        ]);
    }
}
