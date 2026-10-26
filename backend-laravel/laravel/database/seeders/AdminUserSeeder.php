<?php

/**
 * Membuat/menyegarkan HANYA akun login default (admin@aldigens.co.id).
 * Hanya menyentuh tabel `users`. Tidak menyentuh COA, jurnal, inventory,
 * customer/supplier, atau modul lain.
 *
 * Jalankan: php artisan db:seed --class=AdminUserSeeder
 */

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@aldigens.co.id'],
            [
                'name'      => 'admin',
                'full_name' => 'Administrator Sistem',
                'password'  => Hash::make('password'),
                'role'      => 'Administrator',
            ]
        );
    }
}
