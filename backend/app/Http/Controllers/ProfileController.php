<?php

namespace App\Http\Controllers;

use App\Http\Requests\Profile\ChangePasswordRequest;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Http\Requests\Profile\UploadAvatarRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    /**
     * Профиль текущего пользователя.
     *
     * Возвращает данные авторизованного пользователя.
     *
     * @tags Профиль
     */
    public function show(): JsonResponse
    {
        $user = request()->user();

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar_url' => $user->avatar_url,
                'created_at' => $user->created_at,
                'updated_at' => $user->updated_at,
            ]
        ]);
    }

    /**
     * Обновление профиля.
     *
     * Изменяет имя и email текущего пользователя.
     *
     * @tags Профиль
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = request()->user();
        $user->update($request->validated());

        return response()->json([
            'message' => 'Профиль обновлен',
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'avatar_url' => $user->avatar_url,
            ]
        ]);
    }

    /**
     * Загрузка аватара.
     *
     * Принимает файл изображения (jpeg, png, jpg, gif до 2 МБ).
     * Старый аватар удаляется автоматически.
     *
     * @tags Профиль
     */
    public function uploadAvatar(UploadAvatarRequest $request): JsonResponse
    {
        $user = request()->user();

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');
        $user->avatar = $path;
        $user->save();

        return response()->json([
            'message' => 'Аватар обновлён',
            'data' => [
                'avatar_url' => $user->avatar_url,
            ]
        ]);
    }

    /**
     * Удаление аватара.
     *
     * Удаляет текущий аватар пользователя.
     *
     * @tags Профиль
     */
    public function deleteAvatar(): JsonResponse
    {
        $user = request()->user();

        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
            $user->avatar = null;
            $user->save();
        }

        return response()->json([
            'message' => 'Аватар удалён'
        ]);
    }

    /**
     * Смена пароля.
     *
     * Требует текущий пароль. После смены все токены сбрасываются.
     *
     * @tags Профиль
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = request()->user();
        $user->password = $request->new_password;
        $user->save();

        $user->tokens()->delete();

        return response()->json([
            'message' => 'Пароль изменен. Войдите заново'
        ]);
    }

    /**
     * Активные сессии текущего пользователя.
     *
     * Возвращает список Sanctum-токенов пользователя с IP, User-Agent
     * и временем последнего использования. Токен текущего запроса помечен как is_current.
     *
     * @tags Сессии
     */
    public function sessions(): JsonResponse
    {
        $user = request()->user();
        $current = $user->currentAccessToken();
        $currentId = $current?->id;

        $sessions = $user->tokens()
            ->orderByDesc('last_used_at')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'ip_address' => $t->ip_address,
                'user_agent' => $t->user_agent,
                'last_used_at' => $t->last_used_at?->toISOString(),
                'created_at' => $t->created_at?->toISOString(),
                'is_current' => $t->id === $currentId,
            ])
            ->values();

        return response()->json(['data' => $sessions]);
    }

    /**
     * Завершение конкретной сессии.
     *
     * Текущая сессия (тот же токен, что прислал запрос) удаляется через /auth/logout.
     *
     * @tags Сессии
     */
    public function revokeSession(int $id): JsonResponse
    {
        $user = request()->user();
        $current = $user->currentAccessToken();

        if ($current && $current->id === $id) {
            return response()->json([
                'message' => 'Используйте «Выйти» для текущей сессии',
            ], 422);
        }

        $token = $user->tokens()->find($id);
        if (!$token) {
            return response()->json([
                'message' => 'Сессия не найдена',
            ], 404);
        }

        $token->delete();

        return response()->json([
            'message' => 'Сессия завершена',
        ]);
    }

    /**
     * Завершение всех сессий, кроме текущей.
     *
     * Полезно при подозрении на компрометацию.
     *
     * @tags Сессии
     */
    public function revokeOtherSessions(): JsonResponse
    {
        $user = request()->user();
        $current = $user->currentAccessToken();

        $count = $user->tokens()
            ->when($current, fn($q) => $q->where('id', '!=', $current->id))
            ->delete();

        return response()->json([
            'message' => 'Сессии завершены',
            'data' => ['revoked' => (int) $count],
        ]);
    }
}
