<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // AIMS Tahap 1 — paritas SQL mode untuk DATABASE UJI.
        // Server produksi (XAMPP/MariaDB) memakai mode longgar tanpa
        // ONLY_FULL_GROUP_BY, sedangkan MySQL 8 default pada instance lain ketat.
        // Hanya di APP_ENV=testing + database *_test, SQL mode disamakan dengan
        // server sehingga hasil test merepresentasikan perilaku nyata.
        // Tidak berpengaruh pada runtime produksi (APP_ENV=production).
        if ($this->app->environment('testing')) {
            try {
                $connection = \Illuminate\Support\Facades\DB::connection();
                $database = $connection->getDatabaseName();

                if (is_string($database) && str_contains($database, 'test')) {
                    $mode = env(
                        'TEST_SQL_MODE',
                        'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'
                    );
                    $connection->statement('SET SESSION sql_mode = ?', [$mode]);
                }
            } catch (\Throwable $e) {
                // Biarkan test berjalan; masalah koneksi akan terlihat di assertion.
            }
        }
    }
}
