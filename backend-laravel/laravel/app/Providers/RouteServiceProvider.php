<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;

class RouteServiceProvider extends ServiceProvider
{
    /**
     * The path to your application's "home" route.
     *
     * Typically, users are redirected here after authentication.
     *
     * @var string
     */
    public const HOME = '/home';

    /**
     * Define your route model bindings, pattern filters, and other route configuration.
     */
    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });

        // Route model binding existing dipertahankan agar kontrak endpoint tidak
        // berubah. Hanya binding `{id}` yang memakai nama eksplisit dipetakan ke
        // model terkait sehingga {id} tidak lagi menimpa primary key route lain
        // (mis. /spks/{id} vs apiResource yang memakai {spk}).
        // Tidak ada binding global untuk {id}: setiap controller SPK/Employee/
        // Commissioning memakai nama parameter {id} dan melakukan findOrFail.
        // Mapping Route::model('id', ...) akan menimpa SEMUA route ber-{id}
        // (mis. /employees/1 menjadi Spk 1) sehingga dilarang.

        $this->routes(function () {
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }
}
