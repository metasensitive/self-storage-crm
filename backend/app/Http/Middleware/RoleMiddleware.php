<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param Closure(Request): (Response) $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (!$request->user()) {
            return response()->json(['message' => 'Не авторизован'], 401);
        }

        if (in_array($request->user()->role, $roles)) {
            return $next($request);
        }

        return response()->json(['message' => 'Доступ запрещен. Недостаточно прав'], 403);
    }
}
