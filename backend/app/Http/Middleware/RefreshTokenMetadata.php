<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * После auth:sanctum доливает ip_address и user_agent в personal_access_tokens,
 * если в токене они пусты. Это покрывает токены, созданные до миграции
 * с этими столбцами — после первого же запроса они «обогащаются».
 */
class RefreshTokenMetadata
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user) {
            $token = $user->currentAccessToken();
            if ($token && method_exists($token, 'forceFill')) {
                $updates = [];
                if (empty($token->ip_address)) {
                    $updates['ip_address'] = $request->ip();
                }
                if (empty($token->user_agent)) {
                    $updates['user_agent'] = substr((string) $request->userAgent(), 0, 1000);
                }
                if (! empty($updates)) {
                    $token->forceFill($updates)->save();
                }
            }
        }

        return $next($request);
    }
}
