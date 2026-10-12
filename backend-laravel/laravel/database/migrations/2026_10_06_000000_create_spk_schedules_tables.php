<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Penjadwalan operasional SPK — Step 4C.
 *
 * Membuat 2 entitas baru: spk_schedules, spk_schedule_assignments.
 *
 * Semua bersifat ADDITIVE / idempotent (pola sama dengan migration SPK Step 3A):
 * - Tidak mengubah / menghapus / me-rename tabel maupun kolom existing.
 * - Tidak menyentuh tabel `commissionings` (tanggal aktual instalasi &
 *   commissioning tetap milik modul Commissioning).
 * - Kolom SPK tidak disalin ke tabel schedule; cukup relasi spk_id.
 *
 * Satu SPK dapat memiliki banyak schedule (multi-hari / beberapa sesi), dan
 * satu schedule dapat memiliki banyak personel dari tabel `employees`.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ---------------------------------------------------------------
        // 1. Schedule per sesi/hari kerja pada sebuah SPK
        // ---------------------------------------------------------------
        if (!Schema::hasTable('spk_schedules')) {
            Schema::create('spk_schedules', function (Blueprint $table) {
                $table->id();

                // Relasi ke SPK (data induk pekerjaan).
                $table->foreignId('spk_id')->constrained('spks')->cascadeOnDelete();

                // Nomor schedule dibuat otomatis backend: SCH/YYYY/MM/NNNN
                $table->string('schedule_code', 50)->unique();

                // Rencana (planned)
                $table->date('planned_date');
                $table->time('planned_start_time')->nullable();
                $table->time('planned_end_time')->nullable();

                // Realisasi (actual) — hanya untuk sesi/jadwal, BUKAN pengganti
                // installation_date / commissioning_date milik Commissioning.
                $table->date('actual_date')->nullable();
                $table->time('actual_start_time')->nullable();
                $table->time('actual_end_time')->nullable();

                // Aktivitas sesi
                $table->string('activity', 255);
                $table->enum('activity_type', ['WORK', 'INSTALLATION', 'COMMISSIONING', 'OTHER'])
                    ->default('WORK');

                $table->string('location', 255)->nullable();
                $table->string('shift', 50)->nullable();

                $table->enum('priority', ['LOW', 'NORMAL', 'HIGH', 'URGENT'])->default('NORMAL');

                $table->enum('status', ['SCHEDULED', 'IN_PROGRESS', 'DONE', 'POSTPONED', 'CANCELLED'])
                    ->default('SCHEDULED');

                $table->unsignedTinyInteger('progress')->default(0);

                $table->text('reschedule_reason')->nullable();
                $table->text('notes')->nullable();

                // Siapa yang membuat jadwal (akun login, bukan personel lapangan).
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

                $table->timestamps();
                $table->softDeletes();

                // Index untuk filter/urut Penjadwalan.
                $table->index(['spk_id', 'planned_date']);
                $table->index('status');
                $table->index('planned_date');
                $table->index('priority');
            });
        }

        // ---------------------------------------------------------------
        // 2. Penugasan personel pada satu schedule (satu schedule banyak orang)
        // ---------------------------------------------------------------
        if (!Schema::hasTable('spk_schedule_assignments')) {
            Schema::create('spk_schedule_assignments', function (Blueprint $table) {
                $table->id();

                $table->foreignId('spk_schedule_id')->constrained('spk_schedules')->cascadeOnDelete();
                $table->foreignId('employee_id')->constrained('employees')->cascadeOnDelete();

                $table->string('role', 255)->nullable();
                $table->text('notes')->nullable();

                $table->timestamps();

                // Satu karyawan hanya boleh tercatat sekali pada schedule yang sama.
                $table->unique(['spk_schedule_id', 'employee_id']);
                $table->index('employee_id');
            });
        }
    }

    public function down(): void
    {
        // Hanya menghapus tabel yang dibuat pada migration ini.
        Schema::dropIfExists('spk_schedule_assignments');
        Schema::dropIfExists('spk_schedules');
    }
};
