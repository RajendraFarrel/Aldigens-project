<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fondasi data induk pekerjaan operasional (SPK) — Step 3A.
 *
 * Dibuat 4 entitas baru: spks, employees, spk_assignments, spk_ehs_permits.
 *
 * Semua bersifat ADDITIVE:
 * - Tidak mengubah / menghapus tabel existing (customers, users, purchase_orders,
 *   sales_orders, delivery_orders, commissionings, commissioning_items, inventory,
 *   manufacturing / work order).
 * - Relasi ke PO / SO / DO sengaja disimpan sebagai kolom string (nullable),
 *   bukan foreign key, agar tidak menyentuh tabel existing tersebut.
 * - Customer memakai foreign key karena tabel `customers` sudah ada dan pola
 *   yang sama sudah dipakai tabel `commissionings`.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ---------------------------------------------------------------
        // 1. Master personel lapangan (terpisah dari `users` = akun login)
        // ---------------------------------------------------------------
        if (!Schema::hasTable('employees')) {
            Schema::create('employees', function (Blueprint $table) {
                $table->id();
                $table->string('employee_code')->unique();   // Contoh: EMP-0001
                $table->string('employee_name');
                $table->string('position')->nullable();       // Jabatan, mis. Teknisi / Project Leader
                $table->string('department')->nullable();     // Departemen
                $table->string('phone', 30)->nullable();
                $table->enum('status', ['ACTIVE', 'INACTIVE'])->default('ACTIVE');
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        // ---------------------------------------------------------------
        // 2. SPK — data induk pekerjaan operasional
        // ---------------------------------------------------------------
        if (!Schema::hasTable('spks')) {
            Schema::create('spks', function (Blueprint $table) {
                $table->id();

                // Nomor SPK dibuat otomatis oleh backend: SPK/YYYY/MM/NNNN
                $table->string('spk_number')->unique();

                $table->date('spk_date')->nullable();

                // Customer / Project Owner — relasi ke tabel customers yang sudah ada.
                $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();

                // Referensi dokumen-commercial (string, nullable, tanpa FK
                // agar purchase_orders / sales_orders / delivery_orders tidak tersentuh).
                $table->string('po_number')->nullable();
                $table->string('so_number')->nullable();
                $table->string('do_number')->nullable();

                // Identitas pekerjaan
                $table->string('project_name')->nullable();   // Deskripsi / nama pekerjaan
                $table->string('serial_no')->nullable();       // S/N unit
                $table->string('location')->nullable();        // Work location

                // Jangka waktu kerja
                $table->date('start_date')->nullable();
                $table->date('finish_date')->nullable();

                //-data pendukung (dokumen SPK Aldigens)
                $table->string('contractor')->nullable();
                $table->string('project_leader')->nullable();
                $table->string('pic_ehs')->nullable();
                $table->string('person_responsible')->nullable();
                $table->integer('employee_count')->nullable(); // Jumlah karyawan di lokasi

                // Security monitoring
                $table->text('security_monitoring')->nullable();

                $table->text('notes')->nullable();

                $table->enum('status', ['DRAFT', 'OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
                    ->default('DRAFT');

                $table->timestamps();

                // Index untuk pencarian & filter modul operasional.
                $table->index('status');
                $table->index('start_date');
                $table->index('customer_id');
            });
        }

        // ---------------------------------------------------------------
        // 3. Penugasan karyawan pada SPK (satu SPK bisa banyak personel)
        // ---------------------------------------------------------------
        if (!Schema::hasTable('spk_assignments')) {
            Schema::create('spk_assignments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('spk_id')->constrained('spks')->cascadeOnDelete();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();
                $table->string('assignment_role')->nullable(); // Peran dalam SPK ini
                $table->text('notes')->nullable();
                $table->timestamps();

                // Satu karyawan hanya boleh di-assign satu kali pada SPK yang sama.
                $table->unique(['spk_id', 'employee_id']);
            });
        }

        // ---------------------------------------------------------------
        // 4. Checklist EHS / Permit (struktur detail, bukan kolom boolean)
        // ---------------------------------------------------------------
        if (!Schema::hasTable('spk_ehs_permits')) {
            Schema::create('spk_ehs_permits', function (Blueprint $table) {
                $table->id();
                $table->foreignId('spk_id')->constrained('spks')->cascadeOnDelete();
                $table->string('item_type')->nullable();  // Safe Work Permit, Hot Work Permit, EHS Induction, ...
                $table->string('item_name')->nullable();  // Detail/nama item di dokumen
                $table->enum('status', ['PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED', 'NA'])
                    ->default('PENDING');
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['spk_id', 'item_type']);
            });
        }
    }

    public function down(): void
    {
        // Hanya menghapus tabel yang dibuat pada migration ini.
        Schema::dropIfExists('spk_ehs_permits');
        Schema::dropIfExists('spk_assignments');
        Schema::dropIfExists('spks');
        Schema::dropIfExists('employees');
    }
};
