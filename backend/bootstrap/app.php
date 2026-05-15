<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withBroadcasting(
        // Channels-файл + auth-эндпоинт для приватных каналов под Sanctum.
        // SPA шлёт Bearer-токен — `web` guard здесь не подходит (cookie-based),
        // поэтому переопределяем гард на `sanctum`.
        __DIR__.'/../routes/channels.php',
        ['prefix' => 'api', 'middleware' => ['auth:sanctum']],
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Railway (и любой PaaS с reverse-proxy перед приложением) проксирует
        // запросы из внешнего https внутрь контейнера по http. Без явного
        // доверия к прокси Laravel генерирует ссылки с http:// и ломает
        // sanctum-cookie с Secure-флагом. Доверяем всем прокси-IP — мы знаем,
        // что снаружи стоит платформа.
        $middleware->trustProxies(at: '*');

        $middleware->alias([
           'role' => \App\Http\Middleware\RoleMiddleware::class
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
