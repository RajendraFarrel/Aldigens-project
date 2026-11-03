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
        $admin = User::firstOrNew(['email' => 'admin@aldigens.co.id']);
        $admin->fill([
            'name'      => 'admin',
            'full_name' => 'Administrator Sistem',
            'password'  => Hash::make('password'),
            'role'      => 'Administrator',
        ]);
        $admin->save();

        $this->call([
            CustomerSeeder::class,
        ]);

        // $this->call([
        //     ImportExcelMasterSeeder::class,
        // ]);
    }
}