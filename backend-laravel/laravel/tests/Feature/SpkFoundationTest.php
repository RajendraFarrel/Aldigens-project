<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\Spk;
use App\Models\SpkAssignment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Uji fondasi SPK & personel operasional (Step 3A).
 *Dijalankan terhadap database uji, bukan database produksi.
 */
class SpkFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Route modul Operasional berada di dalam middleware auth:sanctum.
        $user = User::create([
            'name' => 'Test User', 'email' => 'spk-test@example.com',
            'password' => bcrypt('secret'), 'role' => 'Administrator',
        ]);
        $this->actingAs($user);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'spk_date'    => '2026-09-25',
            'po_number'   => '990622559 PC200-10M0',
            'project_name' => 'HANDRAIL PC200 ROTARY LAMP BLUE + BRACKET',
            'serial_no'   => 'DBCH4074',
            'location'    => 'SKP',
            'start_date'  => '2026-09-30',
            'finish_date' => '2026-10-13',
            'contractor'  => 'ALDIGENS PUTERA PERDANA',
            'project_leader' => 'FAJAR',
            'pic_ehs'        => 'FAJAR',
            'person_responsible' => 'RAMADHAN DISA NAUFAL',
            'employee_count' => 3,
            'status'      => 'DRAFT',
        ], $overrides);
    }

    private function seedCustomer()
    {
        return DB::table('customers')->insertGetId([
            'customer_code' => 'CUST-TEST',
            'customer_name' => 'PT UNITED TRACTORS Tbk',
            'status' => 'AKTIF',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_migration_membuat_empat_tabel_baru()
    {
        foreach (['spks', 'employees', 'spk_assignments', 'spk_ehs_permits'] as $t) {
            $this->assertTrue(DB::getSchemaBuilder()->hasTable($t), "Tabel $t harus ada");
        }
    }

    public function test_nomor_spk_dibuat_otomatis_dengan_format_benar()
    {
        $res = $this->postJson('/api/spks', $this->payload());
        if ($res->status() !== 201) {
            fwrite(STDERR, "\nBODY: " . $res->getContent() . "\n");
        }
        $res->assertStatus(201);
        $this->assertMatchesRegularExpression('/^SPK\/2026\/09\/\d{4}$/', $res->json('data.spk_number'));
    }

    public function test_nomor_spk_ikut_tahun_dan_bulan_spk_date()
    {
        $r1 = $this->postJson('/api/spks', $this->payload(['spk_date' => '2026-09-25']));
        $r2 = $this->postJson('/api/spks', $this->payload(['spk_date' => '2026-09-26']));
        $r3 = $this->postJson('/api/spks', $this->payload(['spk_date' => '2026-11-01']));

        $this->assertSame('SPK/2026/09/0001', $r1->json('data.spk_number'));
        $this->assertSame('SPK/2026/09/0002', $r2->json('data.spk_number'));
        $this->assertSame('SPK/2026/11/0001', $r3->json('data.spk_number'));
    }

    public function test_nomor_spk_dari_frontend_diabaikan()
    {
        $res = $this->postJson('/api/spks', $this->payload(['spk_number' => 'SPK/1900/01/9999']));
        $res->assertStatus(201);
        $this->assertNotSame('SPK/1900/01/9999', $res->json('data.spk_number'));
    }

    public function test_nomor_spk_unik()
    {
        $this->postJson('/api/spks', $this->payload());
        $this->postJson('/api/spks', $this->payload());
        $this->postJson('/api/spks', $this->payload());

        $this->assertSame(3, Spk::pluck('spk_number')->unique()->count());
    }

    public function test_store_simpan_assignments_dan_ehs_dalam_satu_request()
    {
        $customerId = $this->seedCustomer();
        $fajar    = Employee::create(['employee_code' => 'EMP-0001', 'employee_name' => 'FAJAR', 'position' => 'Project Leader']);
        $ramadhan = Employee::create(['employee_code' => 'EMP-0002', 'employee_name' => 'RAMADHAN DISA NAUFAL']);

        $res = $this->postJson('/api/spks', $this->payload([
            'customer_id' => $customerId,
            'assignments' => [
                ['employee_id' => $fajar->id, 'assignment_role' => 'Project Leader'],
                ['employee_id' => $ramadhan->id, 'assignment_role' => 'Teknisi'],
            ],
            'ehs_permits' => [
                ['item_type' => 'SAFE_WORK_PERMIT', 'item_name' => 'Safe Work Permit'],
                ['item_type' => 'HOT_WORK_PERMIT', 'item_name' => 'Hot Work Permit'],
                ['item_type' => 'EHS_INDUCTION', 'item_name' => 'EHS Induction'],
                ['item_type' => 'SECURITY_MONITORING', 'item_name' => 'Security Monitoring', 'status' => 'NA'],
            ],
        ]));

        $res->assertStatus(201)
            ->assertJsonCount(2, 'data.assignments')
            ->assertJsonCount(4, 'data.ehs_permits');

        $spk = Spk::first();
        $this->assertSame(2, $spk->assignments()->count());
        $this->assertSame(4, $spk->ehsPermits()->count());
        $this->assertSame($customerId, $spk->customer->id);
    }

    public function test_relasi_spk_employee_bersamaan()
    {
        $fajar = Employee::create(['employee_code' => 'EMP-0001', 'employee_name' => 'FAJAR']);
        $res = $this->postJson('/api/spks', $this->payload([
            'assignments' => [['employee_id' => $fajar->id, 'assignment_role' => 'Project Leader']],
        ]));
        $res->assertStatus(201);

        $assignment = SpkAssignment::first();
        $this->assertInstanceOf(Spk::class, $assignment->spk);
        $this->assertInstanceOf(Employee::class, $assignment->employee);
        $this->assertSame(1, $fajar->spkAssignments()->count());
        $this->assertInstanceOf(Spk::class, Spk::first());
    }

    public function test_validasi_menolak_data_buruk()
    {
        $this->postJson('/api/spks', $this->payload([
            'start_date' => '2026-10-13',
            'finish_date' => '2026-09-30',
        ]))->assertStatus(422)->assertJsonValidationErrors('finish_date');

        $this->postJson('/api/spks', $this->payload(['customer_id' => 999999]))
            ->assertStatus(422)->assertJsonValidationErrors('customer_id');

        $this->postJson('/api/spks', $this->payload(['status' => 'NGABAR']))
            ->assertStatus(422)->assertJsonValidationErrors('status');

        $this->postJson('/api/spks', $this->payload(['employee_count' => -5]))
            ->assertStatus(422)->assertJsonValidationErrors('employee_count');

        $this->postJson('/api/spks', $this->payload(['spk_date' => 'bukan tanggal']))
            ->assertStatus(422)->assertJsonValidationErrors('spk_date');

        $this->postJson('/api/spks', $this->payload(['assignments' => [['employee_id' => 999999]]]))
            ->assertStatus(422)->assertJsonValidationErrors('assignments.0.employee_id');

        $this->postJson('/api/spks', $this->payload(['ehs_permits' => [['item_type' => 'TIDAK_VALID']]]))
            ->assertStatus(422)->assertJsonValidationErrors('ehs_permits.0.item_type');
    }

    public function test_hanya_spk_draft_yang_dapat_dihapus()
    {
        $id = $this->postJson('/api/spks', $this->payload())->json('data.id');

        $this->patchJson("/api/spks/{$id}", ['project_name' => 'Diperbarui'])->assertStatus(200);
        $this->patchJson("/api/spks/{$id}", ['status' => 'IN_PROGRESS'])->assertStatus(200);
        $this->deleteJson("/api/spks/{$id}")->assertStatus(422);
        $this->assertDatabaseHas('spks', ['id' => $id]);

        $this->patchJson("/api/spks/{$id}", ['status' => 'DRAFT'])->assertStatus(200);
        $this->deleteJson("/api/spks/{$id}")->assertStatus(200);
        $this->assertDatabaseMissing('spks', ['id' => $id]);
    }

    public function test_employee_crud_dan_kode_unik()
    {
        $this->postJson('/api/employees', ['employee_name' => 'FAJAR'])
            ->assertStatus(201)
            ->assertJsonPath('data.employee_code', 'EMP-0001');

        $this->postJson('/api/employees', ['employee_code' => 'EMP-0001', 'employee_name' => 'DUPLIKAT'])
            ->assertStatus(422)->assertJsonValidationErrors('employee_code');

        $id = $this->postJson('/api/employees', ['employee_name' => 'ANDI'])->json('data.id');
        $this->getJson('/api/employees')->assertStatus(200)->assertJsonCount(2, 'data');
        $this->getJson("/api/employees/{$id}")->assertStatus(200);
        $this->putJson("/api/employees/{$id}", ['employee_name' => 'ANDI SAPUTRA', 'status' => 'INACTIVE'])
            ->assertStatus(200)
            ->assertJsonPath('data.employee_name', 'ANDI SAPUTRA')
            ->assertJsonPath('data.status', 'INACTIVE');
    }

    public function test_tabel_existing_tidak_berubah()
    {
        $before = [];
        foreach (['customers', 'users', 'commissionings', 'commissioning_items', 'sales_orders', 'delivery_orders', 'purchase_orders'] as $t) {
            $before[$t] = DB::getSchemaBuilder()->getColumnListing($t);
        }

        $customerId = $this->seedCustomer();
        $this->postJson('/api/spks', $this->payload(['customer_id' => $customerId]))->assertStatus(201);

        foreach ($before as $t => $cols) {
            $this->assertSame($cols, DB::getSchemaBuilder()->getColumnListing($t), "Struktur $t tidak boleh berubah");
        }

        // commissionings tidak boleh punya kolom spk_id pada tahap ini.
        $this->assertFalse(in_array('spk_id', DB::getSchemaBuilder()->getColumnListing('commissionings'), true));
    }
}
