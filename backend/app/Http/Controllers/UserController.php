<?php

namespace App\Http\Controllers;

use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'data' => $users->map(fn($user) => $this->formatUser($user)),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = User::create($request->validated());

        Log::info('Пользователь создан', [
            'created_by' => $request->user()->id,
            'new_user_id' => $user->id,
            'role' => $user->role,
        ]);

        return response()->json([
            'message' => 'Пользователь создан',
            'data' => $this->formatUser($user),
        ], 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json([
            'data' => $this->formatUser($user),
        ]);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        if ($request->user()->is($user) && $request->has('role')) {
            return response()->json([
                'message' => 'Нельзя изменить свою роль',
            ], 422);
        }

        $data = $request->safe()->except('password');

        if ($request->filled('password')) {
            $data['password'] = $request->password;
        }

        if (isset($data['role']) && $data['role'] !== $user->role) {
            Log::info('Роль пользователя изменена', [
                'changed_by' => $request->user()->id,
                'user_id' => $user->id,
                'old_role' => $user->role,
                'new_role' => $data['role'],
            ]);
        }

        $oldEmail = $user->email;

        $user->update($data);

        if (isset($data['email']) && $data['email'] !== $oldEmail) {
            Log::info('Email пользователя изменён', [
                'changed_by' => $request->user()->id,
                'user_id' => $user->id,
                'old_email' => $oldEmail,
                'new_email' => $data['email'],
            ]);
        }

        if ($request->filled('password')) {
            $user->tokens()->delete();

            Log::info('Пароль пользователя изменён администратором', [
                'changed_by' => $request->user()->id,
                'user_id' => $user->id,
            ]);
        }

        return response()->json([
            'message' => 'Пользователь обновлён',
            'data' => $this->formatUser($user->fresh()),
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        // Нельзя удалить самого себя
        if ($request->user()->is($user)) {
            return response()->json([
                'message' => 'Нельзя удалить самого себя',
            ], 422);
        }

        DB::transaction(function () use ($user, $request) {

            if ($user->avatar) {
                Storage::disk('public')->delete($user->avatar);
            }

            $user->tokens()->delete();

            $user->delete();
        });

        Log::info('Пользователь удалён', [
            'deleted_by' => $request->user()->id,
            'deleted_user_id' => $user->id,
            'deleted_user_email' => $user->email,
        ]);

        return response()->json([
            'message' => 'Пользователь удалён',
        ]);
    }

    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role,
            'avatar_url' => $user->avatar_url,
            'created_at' => $user->created_at?->toISOString(),
            'updated_at' => $user->updated_at?->toISOString(),
        ];
    }
}
