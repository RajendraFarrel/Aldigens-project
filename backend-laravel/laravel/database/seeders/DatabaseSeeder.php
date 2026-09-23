<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Akun default untuk login pertama kali
        User::updateOrCreate(
            ['email' => 'admin@aldigens.co.id'],
            [
                'name'      => 'admin',
                'full_name' => 'Administrator Sistem',
                'password'  => Hash::make('password'),
                'role'      => 'Administrator',
            ]
        );

        User::updateOrCreate(
            ['email' => 'gudang@aldigens.co.id'],
            [
                'name'      => 'gudang',
                'full_name' => 'Staff Gudang',
                'password'  => Hash::make('password'),
                'role'      => 'Staff Gudang',
            ]
        );
    }
}
