<?php

namespace App\Http\Middleware;

use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;

class Authenticate extends Middleware
{
    /**
     * Get the path the user should be redirected to when they are not authenticated.
     */
    protected function redirectTo(Request $request): ?string
    {
        // Request API (mis. dari SPA/mobile) harus selalu dijawab 401 JSON,
        // bukan dialihkan ke route web. Tanpa guard ini, route('login') dipanggil
        // padahal route bernama 'login' tidak ada → RouteNotFoundException (500).
        return ($request->expectsJson() || $request->is('api/*')) ? null : route('login');
    }
}
