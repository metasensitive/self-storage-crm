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
}
