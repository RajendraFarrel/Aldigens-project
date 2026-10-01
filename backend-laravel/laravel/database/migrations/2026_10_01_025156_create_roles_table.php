<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('description')->nullable();
            $table->json('default_menus')->nullable();
            $table->boolean('is_system')->default(false);
            $table->timestamps();
        });

        // Insert default roles
        \DB::table('roles')->insert([
            [
                'name' => 'Administrator',
                'description' => 'Akses penuh ke semua fitur dan pengaturan sistem',
                'default_menus' => json_encode(null),
                'is_system' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Staff Gudang',
                'description' => 'Akses operasional gudang dan transaksi inventori',
                'default_menus' => json_encode(null),
                'is_system' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
