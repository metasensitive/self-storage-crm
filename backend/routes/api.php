<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\ContainerController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\RentController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\NotificationController;

/*
| API Routes v1
|
| все маршруты начинаются с префикса /api/v1
|
*/

Route::prefix('v1')->group(function () {
    // публичные маршруты (гостевые)
    Route::post('auth/login', [AuthController::class, 'login']);
    Route::post('auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('auth/reset-password', [AuthController::class, 'resetPassword']);

    // защищённые маршруты (только авторизованные)
    Route::middleware(['auth:sanctum', \App\Http\Middleware\RefreshTokenMetadata::class])->group(function () {

        // выход
        Route::post('auth/logout', [AuthController::class, 'logout']);

        // уведомления (in-app)
        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index']);
            Route::post('read-all', [NotificationController::class, 'markAllRead']);
            Route::patch('{id}/read', [NotificationController::class, 'markRead']);
        });

        // профиль
        Route::prefix('profile')->group(function () {
            Route::get('/', [ProfileController::class, 'show']);
            Route::put('/', [ProfileController::class, 'update']);
            Route::post('/avatar', [ProfileController::class, 'uploadAvatar']);
            Route::delete('/avatar', [ProfileController::class, 'deleteAvatar']);
            Route::put('/password', [ProfileController::class, 'changePassword']);

            // Сессии (Sanctum-токены текущего пользователя)
            Route::get('/sessions', [ProfileController::class, 'sessions']);
            Route::delete('/sessions', [ProfileController::class, 'revokeOtherSessions']);
            Route::delete('/sessions/{id}', [ProfileController::class, 'revokeSession']);
        });

        // роль: админ + менеджер
        Route::middleware('role:admin,manager')->group(function () {

            // Аренды (полный CRUD для обеих ролей)
            Route::get('rents', [RentController::class, 'index']);
            Route::post('rents', [RentController::class, 'store']);
            Route::get('rents/{rent}', [RentController::class, 'show']);
            Route::patch('rents/{rent}/finish', [RentController::class, 'finishRent']);

            // Чтение локаций, контейнеров, кладовок
            Route::get('locations', [LocationController::class, 'index']);
            Route::get('locations/{location}', [LocationController::class, 'show']);
            Route::get('containers', [ContainerController::class, 'index']);
            Route::get('containers/{container}', [ContainerController::class, 'show']);
            Route::get('units', [UnitController::class, 'index']);
            Route::get('units/{unit}', [UnitController::class, 'show']);

            // Аналитика
            Route::get('analytics/network', [AnalyticsController::class, 'network']);
            Route::get('analytics/locations/{id}', [AnalyticsController::class, 'location']);
            Route::get('analytics/containers/{id}', [AnalyticsController::class, 'container']);
        });

        // только админ
        Route::middleware('role:admin')->group(function () {

            // Пользователи
            Route::apiResource('users', UserController::class);

            // Аудит-лог
            Route::get('activity-logs', [ActivityLogController::class, 'index']);

            // Локации (CRUD)
            Route::post('locations', [LocationController::class, 'store']);
            Route::put('locations/{location}', [LocationController::class, 'update']);
            Route::delete('locations/{location}', [LocationController::class, 'destroy']);

            // Контейнеры (массовые операции — ДО `/{container}` роутов, иначе
            // /containers/bulk матчится как /containers/{container} с id='bulk').
            Route::post('containers/bulk/status', [ContainerController::class, 'bulkUpdateStatus']);
            Route::delete('containers/bulk', [ContainerController::class, 'bulkDestroy']);
            // Контейнеры (CRUD)
            Route::post('containers', [ContainerController::class, 'store']);
            Route::put('containers/{container}', [ContainerController::class, 'update']);
            Route::delete('containers/{container}', [ContainerController::class, 'destroy']);
            Route::patch('containers/{container}/status', [ContainerController::class, 'updateStatus']);

            // Кладовки (массовые операции — ДО `/{unit}` роутов).
            Route::post('units/bulk/status', [UnitController::class, 'bulkUpdateStatus']);
            Route::delete('units/bulk', [UnitController::class, 'bulkDestroy']);
            // Кладовки (CRUD)
            Route::post('units', [UnitController::class, 'store']);
            Route::put('units/{unit}', [UnitController::class, 'update']);
            Route::delete('units/{unit}', [UnitController::class, 'destroy']);
            Route::patch('units/{unit}/status', [UnitController::class, 'updateStatus']);
            Route::patch('units/{unit}/price', [UnitController::class, 'updatePrice']);
        });
    });
});
