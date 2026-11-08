<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    /**
     * Memastikan role yang dipakai user test benar-benar ada di tabel `roles`.
     *
     * Sejak Tahap 1 AIMS, middleware permission menolak (HTTP 403) user yang
     * role-nya tidak valid. Test lama membuat user dengan `role` => 'Administrator'
     * tanpa membuat baris roles, sehingga helper ini menjamin role tersebut ada
     * (INSERT ... OR IGNORE; tidak menghapus apa pun).
     *
     * @param string[] $roles
     */
    protected function ensureRoles(array $roles = ['Administrator', 'Staff Gudang']): void
    {
        try {
            if (!\Illuminate\Support\Facades\Schema::hasTable('roles')) {
                return;
            }

            foreach ($roles as $name) {
                \App\Models\Role::firstOrCreate(
                    ['name' => $name],
                    ['is_system' => in_array($name, ['Administrator', 'Staff Gudang'], true)]
                );
            }

            // Sinkronkan permission role sesuai katalog agar user test Administrator
            // memegang seluruh hak (sama seperti seeder). Idempotent & tidak
            // menghapus user/role/data.
            $seeder = new \Database\Seeders\PermissionSeeder();
            $seeder->onlyRoles = $roles;
            $seeder->run();
        } catch (\Throwable $e) {
            // Test tetap berjalan; kegagalan akan terlihat pada assertion terkait.
        }
    }
}
