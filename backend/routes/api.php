<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\ContainerController;
use App\Http\Controllers\UnitController;

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
            Route::get('locations', [LocationController::class, 'index']);
            Route::get('locations/{location}', [LocationController::class, 'show']);
            Route::get('containers', [ContainerController::class, 'index']);
            Route::get('containers/{container}', [ContainerController::class, 'show']);
            Route::get('units', [UnitController::class, 'index']);
            Route::get('units/{unit}', [UnitController::class, 'show']);

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
            Route::post('locations', [LocationController::class, 'store']);
            Route::put('locations/{location}', [LocationController::class, 'update']);
            Route::delete('locations/{location}', [LocationController::class, 'destroy']);

            // Контейнеры (CRUD)
            Route::post('containers', [ContainerController::class, 'store']);
            Route::put('containers/{container}', [ContainerController::class, 'update']);
            Route::delete('containers/{container}', [ContainerController::class, 'destroy']);
            Route::patch('containers/{container}/status', [ContainerController::class, 'updateStatus']);

            // Кладовки (CRUD)
            Route::post('units', [UnitController::class, 'store']);
            Route::put('units/{unit}', [UnitController::class, 'update']);
            Route::delete('units/{unit}', [UnitController::class, 'destroy']);
            Route::patch('units/{unit}/status', [UnitController::class, 'updateStatus']);
            Route::patch('units/{unit}/price', [UnitController::class, 'updatePrice']);
        });
    });
});
