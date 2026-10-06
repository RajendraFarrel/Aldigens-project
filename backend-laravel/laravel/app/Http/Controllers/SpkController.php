<?php

namespace App\Http\Controllers;

use App\Models\Spk;
use App\Models\SpkAssignment;
use App\Models\SpkEhsPermit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * API data induk pekerjaan operasional (SPK). Step 3A.
 *
 * Catatan:
 * - `spk_number` SELALU dibuat backend (Spk::generateNumber) dan tidak pernah
 *   dipercaya dari input frontend.
 * - assignments & ehs_permits boleh ikut disimpan dalam satu request
 *   menggunakan database transaction.
 * - Tidak ada relasi ke Commissioning pada tahap ini.
 */
class SpkController extends Controller
{
    /** Aturan validasi yang dipakai bersama oleh store & update. */
    private function rules(): array
    {
        return [
            'spk_date'    => ['nullable', 'date'],
            'customer_id' => ['nullable', 'exists:customers,id'],
            'po_number'   => ['nullable', 'string', 'max:255'],
            'so_number'   => ['nullable', 'string', 'max:255'],
            'do_number'   => ['nullable', 'string', 'max:255'],
            'project_name' => ['nullable', 'string', 'max:255'],
            'serial_no'   => ['nullable', 'string', 'max:255'],
            'location'    => ['nullable', 'string', 'max:255'],
            'start_date'  => ['nullable', 'date'],
            'finish_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'contractor'  => ['nullable', 'string', 'max:255'],
            'project_leader'      => ['nullable', 'string', 'max:255'],
            'pic_ehs'             => ['nullable', 'string', 'max:255'],
            'person_responsible'  => ['nullable', 'string', 'max:255'],
            'employee_count'      => ['nullable', 'integer', 'min:0'],
            'security_monitoring' => ['nullable', 'string'],
            'notes'      => ['nullable', 'string'],
            'status'     => ['nullable', Rule::in(Spk::STATUSES)],

            'assignments' => ['nullable', 'array'],
            'assignments.*.employee_id'    => ['required', 'exists:employees,id'],
            'assignments.*.assignment_role' => ['nullable', 'string', 'max:255'],
            'assignments.*.notes'          => ['nullable', 'string'],

            'ehs_permits' => ['nullable', 'array'],
            'ehs_permits.*.item_type' => ['nullable', Rule::in(SpkEhsPermit::TYPES)],
            'ehs_permits.*.item_name' => ['nullable', 'string', 'max:255'],
            'ehs_permits.*.status'    => ['nullable', Rule::in(SpkEhsPermit::STATUSES)],
            'ehs_permits.*.notes'     => ['nullable', 'string'],
        ];
    }

    /** GET /api/spks */
    public function index(Request $request)
    {
        $spks = Spk::with(['customer', 'assignments.employee'])
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->customer_id, fn($q) => $q->where('customer_id', $request->customer_id))
            ->when($request->search, function ($q) use ($request) {
                $s = $request->search;
                $q->where(function ($sub) use ($s) {
                    $sub->where('spk_number', 'like', "%$s%")
                        ->orWhere('project_name', 'like', "%$s%")
                        ->orWhere('serial_no', 'like', "%$s%")
                        ->orWhere('po_number', 'like', "%$s%");
                });
            })
            ->latest()
            ->get();

        return response()->json(['status' => 'success', 'data' => $spks]);
    }

    /** GET /api/spks/{id} */
    public function show($id)
    {
        $spk = Spk::with(['customer', 'assignments.employee', 'ehsPermits'])->findOrFail($id);

        return response()->json(['status' => 'success', 'data' => $spk]);
    }

    /** POST /api/spks */
    public function store(Request $request)
    {
        $data = $request->validate($this->rules());

        try {
            DB::beginTransaction();

            $spk = new Spk($this->spkAttributes($data));
            // spk_number sengaja tidak ada di $fillable agar frontend tidak
            // boleh mengisinya; jadi harus di-set eksplisit lewat forceFill.
            $spk->forceFill(['spk_number' => Spk::generateNumber($data['spk_date'] ?? null)]);
            $spk->save();

            $this->syncAssignments($spk, $data['assignments'] ?? []);
            $this->syncEhsPermits($spk, $data['ehs_permits'] ?? []);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal menyimpan SPK: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'SPK berhasil disimpan.',
            'data'    => $spk->load(['customer', 'assignments.employee', 'ehsPermits']),
        ], 201);
    }

    /** PUT /api/spks/{id} */
    public function update(Request $request, $id)
    {
        $spk = Spk::findOrFail($id);
        $data = $request->validate($this->rules());

        try {
            DB::beginTransaction();

            $spk->update($this->spkAttributes($data));

            $this->syncAssignments($spk, $data['assignments'] ?? []);
            $this->syncEhsPermits($spk, $data['ehs_permits'] ?? []);

            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'status'  => 'error',
                'message' => 'Gagal memperbarui SPK: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'SPK berhasil diperbarui.',
            'data'    => $spk->fresh(['customer', 'assignments.employee', 'ehsPermits']),
        ]);
    }

    /** DELETE /api/spks/{id} — hanya untuk SPK berstatus DRAFT. */
    public function destroy($id)
    {
        $spk = Spk::findOrFail($id);

        if ($spk->status !== Spk::STATUS_DRAFT) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Hanya SPK berstatus DRAFT yang dapat dihapus. Status saat ini: ' . $spk->status,
            ], 422);
        }

        $spk->delete();

        return response()->json(['status' => 'success', 'message' => 'SPK berhasil dihapus.']);
    }

    /** Ambil hanya kolom header SPK (tanpa assignments/EHS). */
    private function spkAttributes(array $data): array
    {
        return [
            'spk_date'             => $data['spk_date'] ?? null,
            'customer_id'          => $data['customer_id'] ?? null,
            'po_number'            => $data['po_number'] ?? null,
            'so_number'            => $data['so_number'] ?? null,
            'do_number'            => $data['do_number'] ?? null,
            'project_name'         => $data['project_name'] ?? null,
            'serial_no'            => $data['serial_no'] ?? null,
            'location'             => $data['location'] ?? null,
            'start_date'           => $data['start_date'] ?? null,
            'finish_date'          => $data['finish_date'] ?? null,
            'contractor'           => $data['contractor'] ?? null,
            'project_leader'       => $data['project_leader'] ?? null,
            'pic_ehs'              => $data['pic_ehs'] ?? null,
            'person_responsible'   => $data['person_responsible'] ?? null,
            'employee_count'       => $data['employee_count'] ?? null,
            'security_monitoring'  => $data['security_monitoring'] ?? null,
            'notes'                => $data['notes'] ?? null,
            'status'               => $data['status'] ?? Spk::STATUS_DRAFT,
        ];
    }

    private function syncAssignments(Spk $spk, array $assignments): void
    {
        // Ganti daftar personel SPK ini dengan daftar baru bila dikirim.
        if ($assignments !== []) {
            $spk->assignments()->delete();
            foreach ($assignments as $row) {
                SpkAssignment::create([
                    'spk_id'          => $spk->id,
                    'employee_id'     => $row['employee_id'],
                    'assignment_role' => $row['assignment_role'] ?? null,
                    'notes'           => $row['notes'] ?? null,
                ]);
            }
        }
    }

    private function syncEhsPermits(Spk $spk, array $ehsPermits): void
    {
        if ($ehsPermits !== []) {
            $spk->ehsPermits()->delete();
            foreach ($ehsPermits as $row) {
                SpkEhsPermit::create([
                    'spk_id'    => $spk->id,
                    'item_type' => $row['item_type'] ?? null,
                    'item_name' => $row['item_name'] ?? null,
                    'status'    => $row['status'] ?? SpkEhsPermit::STATUS_PENDING,
                    'notes'     => $row['notes'] ?? null,
                ]);
            }
        }
    }
}
