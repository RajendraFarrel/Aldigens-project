<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Spk;
use App\Models\SpkSchedule;
use App\Models\SpkScheduleAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Uji Penjadwalan operasional SPK (Step 4C).
 * Dijalankan terhadap database uji, bukan database produksi.
 */
class SpkScheduleTest extends TestCase
{
    use RefreshDatabase;

    private int $customerId;

    protected function setUp(): void
    {
        parent::setUp();

        // Route Penjadwalan berada di dalam middleware auth:sanctum.
        $user = User::create([
            'name' => 'Test User',
            'email' => 'sched-test@example.com',
            'password' => bcrypt('secret'),
            'role' => 'Administrator',
        ]);
        $this->actingAs($user);

        $this->customerId = DB::table('customers')->insertGetId([
            'customer_code' => 'CUST-TEST',
            'customer_name' => 'PT UNITED TRACTORS Tbk',
            'status' => 'AKTIF',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /** Buat SPK langsung via model (data induk untuk jadwal). */
    private function makeSpk(array $overrides = []): Spk
    {
        $spk = new Spk(array_merge([
            'spk_date'     => '2026-09-25',
            'customer_id'  => $this->customerId,
            'project_name' => 'HANDRAIL PC200 ROTARY LAMP BLUE + BRACKET',
            'serial_no'    => 'DBCH4074',
            'location'     => 'SKP',
            'start_date'   => '2026-09-30',
            'finish_date'  => '2026-10-13',
            'status'       => 'OPEN',
        ], $overrides));
        $spk->forceFill(['spk_number' => Spk::generateNumber($spk->spk_date)]);
        $spk->save();

        return $spk;
    }

    private function makeEmployee(string $name, string $status = 'ACTIVE'): Employee
    {
        return Employee::create([
            'employee_code' => Employee::generateCode(),
            'employee_name' => $name,
            'status'        => $status,
        ]);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'planned_date' => '2026-10-02',
            'activity'     => 'Fabrikasi & instalasi handrail + bracket',
            'activity_type' => 'INSTALLATION',
            'priority'     => 'HIGH',
        ], $overrides);
    }

    /* ── Migration & struktur ── */

    public function test_migration_membuat_tabel_penjadwalan()
    {
        foreach (['spk_schedules', 'spk_schedule_assignments'] as $t) {
            $this->assertTrue(DB::getSchemaBuilder()->hasTable($t), "Tabel $t harus ada");
        }

        // Tabel existing tidak boleh disentuh / ditambah kolom.
        $this->assertFalse(in_array('spk_id', DB::getSchemaBuilder()->getColumnListing('commissionings'), true));
    }

    /* ── Create ── */

    public function test_create_schedule_dengan_kode_otomatis()
    {
        $spk = $this->makeSpk();

        $res = $this->postJson('/api/spk-schedules', $this->payload(['spk_id' => $spk->id]));

        if ($res->status() !== 201) {
            fwrite(STDERR, "\nBODY: " . $res->getContent() . "\n");
        }

        $res->assertStatus(201)
            ->assertJsonPath('data.status', 'SCHEDULED')
            ->assertJsonPath('data.progress', 0);

        $this->assertMatchesRegularExpression('/^SCH\/2026\/10\/\d{4}$/', $res->json('data.schedule_code'));
        $this->assertSame('SCH/2026/10/0001', $res->json('data.schedule_code'));
    }

    public function test_schedule_terhubung_ke_spk_dan_memuat_relasi()
    {
        $spk = $this->makeSpk();
        $res = $this->postJson('/api/spk-schedules', $this->payload(['spk_id' => $spk->id]));
        $res->assertStatus(201);

        $schedule = SpkSchedule::first();
        $this->assertInstanceOf(Spk::class, $schedule->spk);
        $this->assertSame($spk->id, $schedule->spk_id);
        $this->assertSame(1, $spk->schedules()->count());

        // Data SPK read-only tersedia lewat relasi, bukan disalin.
        $this->getJson("/api/spk-schedules/{$schedule->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.spk.spk_number', $spk->spk_number)
            ->assertJsonPath('data.spk.customer.id', $this->customerId);
    }

    public function test_schedule_code_dari_frontend_diabaikan()
    {
        $spk = $this->makeSpk();
        $res = $this->postJson('/api/spk-schedules', $this->payload([
            'spk_id' => $spk->id,
            'schedule_code' => 'SCH/1900/01/9999',
        ]));

        $res->assertStatus(201);
        $this->assertNotSame('SCH/1900/01/9999', $res->json('data.schedule_code'));
    }

    public function test_assignment_employee_disimpan_bersama_schedule()
    {
        $spk = $this->makeSpk();
        $fajar = $this->makeEmployee('FAJAR');
        $andi  = $this->makeEmployee('ANDI');

        $res = $this->postJson('/api/spk-schedules', $this->payload([
            'spk_id' => $spk->id,
            'assignments' => [
                ['employee_id' => $fajar->id, 'role' => 'Project Leader'],
                ['employee_id' => $andi->id, 'role' => 'Teknisi'],
            ],
        ]));

        $res->assertStatus(201)->assertJsonCount(2, 'data.assignments');

        $schedule = SpkSchedule::first();
        $this->assertSame(2, $schedule->assignments()->count());
        $this->assertInstanceOf(Employee::class, SpkScheduleAssignment::first()->employee);
        $this->assertSame(1, $fajar->scheduleAssignments()->count());
    }

    public function test_employee_harus_active()
    {
        $spk = $this->makeSpk();
        $inactive = $this->makeEmployee('BUDI', 'INACTIVE');

        $this->postJson('/api/spk-schedules', $this->payload([
            'spk_id' => $spk->id,
            'assignments' => [['employee_id' => $inactive->id, 'role' => 'Teknisi']],
        ]))->assertStatus(422)->assertJsonValidationErrors('assignments');

        $this->assertSame(0, SpkSchedule::count());
    }

    public function test_spk_cancelled_ditolak()
    {
        $spk = $this->makeSpk(['status' => 'CANCELLED']);

        $this->postJson('/api/spk-schedules', $this->payload(['spk_id' => $spk->id]))
            ->assertStatus(422)
            ->assertJsonValidationErrors('spk_id');

        $this->assertSame(0, SpkSchedule::count());
    }

    public function test_postponed_wajib_alasan()
    {
        $spk = $this->makeSpk();

        $this->postJson('/api/spk-schedules', $this->payload([
            'spk_id' => $spk->id,
            'status' => 'POSTPONED',
        ]))->assertStatus(422)->assertJsonValidationErrors('reschedule_reason');

        $this->postJson('/api/spk-schedules', $this->payload([
            'spk_id' => $spk->id,
            'status' => 'POSTPONED',
            'reschedule_reason' => 'Cuaca buruk',
        ]))->assertStatus(201)->assertJsonPath('data.status', 'POSTPONED');
    }

    public function test_progress_diluar_0_100_ditolak()
    {
        $spk = $this->makeSpk();

        $this->postJson('/api/spk-schedules', $this->payload(['spk_id' => $spk->id, 'progress' => 101]))
            ->assertStatus(422)->assertJsonValidationErrors('progress');

        $this->postJson('/api/spk-schedules', $this->payload(['spk_id' => $spk->id, 'progress' => -1]))
            ->assertStatus(422)->assertJsonValidationErrors('progress');
    }

    public function test_planned_end_tidak_boleh_sebelum_start()
    {
        $spk = $this->makeSpk();

        $this->postJson('/api/spk-schedules', $this->payload([
            'spk_id' => $spk->id,
            'planned_start_time' => '14:00',
            'planned_end_time'   => '08:00',
        ]))->assertStatus(422)->assertJsonValidationErrors('planned_end_time');
    }

    public function test_actual_end_tidak_boleh_sebelum_actual_start()
    {
        $spk = $this->makeSpk();

        $this->postJson('/api/spk-schedules', $this->payload([
            'spk_id' => $spk->id,
            'status' => 'IN_PROGRESS',
            'actual_date' => '2026-10-02',
            'actual_start_time' => '15:00',
            'actual_end_time'   => '09:00',
        ]))->assertStatus(422)->assertJsonValidationErrors('actual_end_time');
    }

    public function test_actual_hanya_saat_in_progress_atau_done()
    {
        $spk = $this->makeSpk();

        $this->postJson('/api/spk-schedules', $this->payload([
            'spk_id' => $spk->id,
            'status' => 'SCHEDULED',
            'actual_date' => '2026-10-02',
        ]))->assertStatus(422)->assertJsonValidationErrors('actual_date');
    }

    public function test_activity_dan_planned_date_wajib()
    {
        $spk = $this->makeSpk();

        $this->postJson('/api/spk-schedules', ['spk_id' => $spk->id, 'activity' => 'X'])
            ->assertStatus(422)->assertJsonValidationErrors('planned_date');

        $this->postJson('/api/spk-schedules', ['spk_id' => $spk->id, 'planned_date' => '2026-10-02'])
            ->assertStatus(422)->assertJsonValidationErrors('activity');
    }

    public function test_planned_date_di_luar_rentang_spk_ditolak()
    {
        $spk = $this->makeSpk();

        $this->postJson('/api/spk-schedules', $this->payload([
            'spk_id' => $spk->id,
            'planned_date' => '2026-10-20',
        ]))->assertStatus(422)->assertJsonValidationErrors('planned_date');
    }

    public function test_update_schedule_dan_sinkronisasi_assignments()
    {
        $spk = $this->makeSpk();
        $fajar = $this->makeEmployee('FAJAR');
        $andi  = $this->makeEmployee('ANDI');

        $id = $this->postJson('/api/spk-schedules', $this->payload([
            'spk_id' => $spk->id,
            'assignments' => [['employee_id' => $fajar->id, 'role' => 'Teknisi']],
        ]))->json('data.id');

        // Ganti personel + ubah aktivitas.
        $this->putJson("/api/spk-schedules/{$id}", [
            'planned_date' => '2026-10-03',
            'activity'     => 'Pemasangan rotary lamp',
            'assignments'  => [['employee_id' => $andi->id, 'role' => 'Teknisi']],
        ])->assertStatus(200)->assertJsonCount(1, 'data.assignments');

        $schedule = SpkSchedule::find($id);
        $this->assertSame('Pemasangan rotary lamp', $schedule->activity);
        $this->assertSame($andi->id, $schedule->assignments()->first()->employee_id);
        $this->assertSame(1, SpkScheduleAssignment::count());
    }

    public function test_spk_id_tidak_boleh_dipindah_saat_edit()
    {
        $spkA = $this->makeSpk();
        $spkB = $this->makeSpk(['project_name' => 'PROJECT LAIN']);

        $id = $this->postJson('/api/spk-schedules', $this->payload(['spk_id' => $spkA->id]))->json('data.id');

        $this->putJson("/api/spk-schedules/{$id}", [
            'planned_date' => '2026-10-03',
            'activity'     => 'X',
            'spk_id'       => $spkB->id,
        ])->assertStatus(422)->assertJsonValidationErrors('spk_id');
    }

    public function test_schedule_done_tidak_boleh_diedit()
    {
        $spk = $this->makeSpk();
        $id = $this->postJson('/api/spk-schedules', $this->payload([
            'spk_id' => $spk->id,
            'status' => 'DONE',
        ]))->json('data.id');

        $this->putJson("/api/spk-schedules/{$id}", [
            'planned_date' => '2026-10-05',
            'activity'     => 'Coba edit',
        ])->assertStatus(422)->assertJsonValidationErrors('status');
    }

    public function test_delete_scheduled_berhasil_dan_done_ditolak()
    {
        $spk = $this->makeSpk();

        $scheduledId = $this->postJson('/api/spk-schedules', $this->payload(['spk_id' => $spk->id]))->json('data.id');
        $this->deleteJson("/api/spk-schedules/{$scheduledId}")->assertStatus(200);
        $this->assertSoftDeleted('spk_schedules', ['id' => $scheduledId]);

        $doneId = $this->postJson('/api/spk-schedules', $this->payload([
            'spk_id' => $spk->id,
            'planned_date' => '2026-10-04',
            'status' => 'DONE',
        ]))->json('data.id');
        $this->deleteJson("/api/spk-schedules/{$doneId}")->assertStatus(422);
        $this->assertNotSoftDeleted('spk_schedules', ['id' => $doneId]);
    }

    /* ── Endpoint status & progress ── */

    public function test_patch_status_dan_progress()
    {
        $spk = $this->makeSpk();
        $id = $this->postJson('/api/spk-schedules', $this->payload(['spk_id' => $spk->id]))->json('data.id');

        $this->patchJson("/api/spk-schedules/{$id}/status", ['status' => 'IN_PROGRESS'])
            ->assertStatus(200)->assertJsonPath('data.status', 'IN_PROGRESS');

        $this->patchJson("/api/spk-schedules/{$id}/status", ['status' => 'POSTPONED'])
            ->assertStatus(422)->assertJsonValidationErrors('reschedule_reason');

        $this->patchJson("/api/spk-schedules/{$id}/progress", ['progress' => 55])
            ->assertStatus(200)->assertJsonPath('data.progress', 55);

        $this->patchJson("/api/spk-schedules/{$id}/progress", ['progress' => 150])
            ->assertStatus(422)->assertJsonValidationErrors('progress');
    }

    public function test_status_spk_tidak_berubah_karena_schedule()
    {
        $spk = $this->makeSpk(['status' => 'OPEN']);
        $id = $this->postJson('/api/spk-schedules', $this->payload(['spk_id' => $spk->id]))->json('data.id');

        $this->patchJson("/api/spk-schedules/{$id}/status", ['status' => 'DONE'])->assertStatus(200);

        $this->assertSame('OPEN', $spk->fresh()->status, 'Status SPK tidak boleh berubah otomatis.');
    }

    /* ── Filter index ── */

    public function test_index_dapat_difilter()
    {
        $spkA = $this->makeSpk();
        $spkB = $this->makeSpk(['project_name' => 'PEKERJAAN LAIN', 'serial_no' => 'ZZZZ']);
        $emp  = $this->makeEmployee('FAJAR');

        $this->postJson('/api/spk-schedules', $this->payload(['spk_id' => $spkA->id, 'assignments' => [['employee_id' => $emp->id]]]));
        $this->postJson('/api/spk-schedules', $this->payload(['spk_id' => $spkB->id, 'planned_date' => '2026-10-05', 'status' => 'IN_PROGRESS']));

        $this->getJson('/api/spk-schedules')->assertStatus(200)->assertJsonCount(2, 'data');

        $this->getJson("/api/spk-schedules?spk_id={$spkA->id}")->assertJsonCount(1, 'data');
        $this->getJson('/api/spk-schedules?status=IN_PROGRESS')->assertJsonCount(1, 'data');
        $this->getJson("/api/spk-schedules?employee_id={$emp->id}")->assertJsonCount(1, 'data');
        $this->getJson('/api/spk-schedules?date_from=2026-10-04')->assertJsonCount(1, 'data');
        $this->getJson('/api/spk-schedules?date_to=2026-10-03')->assertJsonCount(1, 'data');

        // q dapat mencari nomor SPK & project name.
        $this->getJson('/api/spk-schedules?q=' . urlencode($spkA->spk_number))->assertJsonCount(1, 'data');
        $this->getJson('/api/spk-schedules?q=PEKERJAAN')->assertJsonCount(1, 'data');
    }

    /* ── Bentrok personel ── */

    public function test_bentrok_personel_ditolak_tapi_tanggal_beda_diizinkan()
    {
        $spk = $this->makeSpk();
        $emp = $this->makeEmployee('FAJAR');

        // Jadwal pertama 02 Okt 08:00–12:00.
        $this->postJson('/api/spk-schedules', $this->payload([
            'spk_id' => $spk->id,
            'planned_start_time' => '08:00',
            'planned_end_time'   => '12:00',
            'assignments' => [['employee_id' => $emp->id]],
        ]))->assertStatus(201);

        // Overlap pada tanggal yang sama → ditolak.
        $this->postJson('/api/spk-schedules', $this->payload([
            'spk_id' => $spk->id,
            'planned_start_time' => '10:00',
            'planned_end_time'   => '14:00',
            'assignments' => [['employee_id' => $emp->id]],
        ]))->assertStatus(422);

        // Tanggal berbeda → diizinkan.
        $this->postJson('/api/spk-schedules', $this->payload([
            'spk_id' => $spk->id,
            'planned_date' => '2026-10-03',
            'planned_start_time' => '10:00',
            'planned_end_time'   => '14:00',
            'assignments' => [['employee_id' => $emp->id]],
        ]))->assertStatus(201);

        // Tanggal sama tapi jam tidak overlap → diizinkan.
        $this->postJson('/api/spk-schedules', $this->payload([
            'spk_id' => $spk->id,
            'planned_start_time' => '13:00',
            'planned_end_time'   => '17:00',
            'assignments' => [['employee_id' => $emp->id]],
        ]))->assertStatus(201);

        $this->assertSame(3, SpkSchedule::count());
    }

    /* ── Tidak menyentuh modul lain ── */

    public function test_tidak_mengubah_struktur_tabel_existing()
    {
        $before = [];
        foreach (['spks', 'employees', 'customers', 'users', 'commissionings', 'commissioning_items'] as $t) {
            $before[$t] = DB::getSchemaBuilder()->getColumnListing($t);
        }

        $spk = $this->makeSpk();
        $this->postJson('/api/spk-schedules', $this->payload(['spk_id' => $spk->id]))->assertStatus(201);

        foreach ($before as $t => $cols) {
            $this->assertSame($cols, DB::getSchemaBuilder()->getColumnListing($t), "Struktur $t tidak boleh berubah");
        }
    }
}
