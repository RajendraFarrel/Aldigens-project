<?php

namespace App\Exceptions;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Throwable;

class Handler extends ExceptionHandler
{
    /**
     * The list of the inputs that are never flashed to the session on validation exceptions.
     *
     * @var array<int, string>
     */
    protected $dontFlash = [
        'current_password',
        'password',
        'password_confirmation',
    ];

    /**
     * Register the exception handling callbacks for the application.
     */
    public function register(): void
    {
        $this->reportable(function (Throwable $e) {
            //
        });
    }

    /**
     * Request API (mis. dari SPA/mobile) harus dijawab 401 JSON, bukan dialihkan
     * ke route 'login'. Route bernama 'login' tidak ada di aplikasi ini sehingga
     * redirect()\->guest(route('login')) melempar RouteNotFoundException (500).
     */
    protected function unauthenticated($request, AuthenticationException $exception)
    {
        if ($request->expectsJson() || $request->is('api/*')) {
            return response()->json(['message' => $exception->getMessage()], 401);
        }

        return parent::unauthenticated($request, $exception);
    }
}
