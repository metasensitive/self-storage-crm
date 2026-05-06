<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

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
    Route::middleware('auth:sanctum')->group(function () {

        // выход
        Route::post('auth/logout', [AuthController::class, 'logout']);

        // профиль
        Route::prefix('profile')->group(function () {
            Route::get('/', [ProfileController::class, 'show']);
            Route::put('/', [ProfileController::class, 'update']);
            Route::post('/avatar', [ProfileController::class, 'uploadAvatar']);
            Route::delete('/avatar', [ProfileController::class, 'deleteAvatar']);
            Route::put('/password', [ProfileController::class, 'changePassword']);
        });

        // роль: админ + менеджер
        Route::middleware('role:admin,manager')->group(function () {

            // Аренды (полный CRUD для обеих ролей)
            // Route::apiResource('rents', RentController::class);
            // Route::patch('rents/{id}/finish', [RentController::class, 'finish']);

            // Чтение локаций, контейнеров, кладовок
            // Route::get('locations', [LocationController::class, 'index']);
            // Route::get('locations/{id}', [LocationController::class, 'show']);
            // Route::get('containers', [ContainerController::class, 'index']);
            // Route::get('containers/{id}', [ContainerController::class, 'show']);
            // Route::get('units', [UnitController::class, 'index']);
            // Route::get('units/{id}', [UnitController::class, 'show']);

            // Аналитика
            // Route::get('analytics/network', [AnalyticsController::class, 'network']);
            // Route::get('analytics/locations/{id}', [AnalyticsController::class, 'location']);
            // Route::get('analytics/containers/{id}', [AnalyticsController::class, 'container']);
        });

        // только админ
        Route::middleware('role:admin')->group(function () {

            // Пользователи
            Route::apiResource('users', UserController::class);

            // Локации (CRUD)
            // Route::apiResource('locations', LocationController::class);

            // Контейнеры (CRUD)
            // Route::apiResource('containers', ContainerController::class);
            // Route::patch('containers/{id}/status', [ContainerController::class, 'updateStatus']);

            // Кладовки (CRUD)
            // Route::apiResource('units', UnitController::class);
            // Route::patch('units/{id}/status', [UnitController::class, 'updateStatus']);
            // Route::patch('units/{id}/price', [UnitController::class, 'updatePrice']);
        });
    });
});
