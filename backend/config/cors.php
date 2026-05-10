<?php

/**
 * Cross-Origin Resource Sharing (CORS) Configuration.
 *
 * Список разрешённых origins собирается из:
 *  - FRONTEND_URL — основной домен (используется и для генерации ссылок в письмах);
 *  - CORS_ALLOWED_ORIGINS — дополнительные origins через запятую
 *    (например, dev и preview порты Vite, продовые алиасы и т.п.);
 *  - дефолтных локальных адресов разработки, если ничего не указано.
 *
 * Пустые значения и дубликаты автоматически отбрасываются.
 */
$frontendUrl = env('FRONTEND_URL');
$extraOrigins = array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')));

$defaultDevOrigins = [
    'http://localhost:5173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4173',
];

$allowedOrigins = array_values(array_unique(array_filter(array_merge(
    [$frontendUrl],
    $extraOrigins,
    $defaultDevOrigins,
))));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $allowedOrigins,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
