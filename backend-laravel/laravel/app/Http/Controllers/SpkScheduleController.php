<?php

namespace App\Http\Controllers;

use App\Models\Employee;
use App\Models\Spk;
use App\Models\SpkSchedule;
use App\Models\SpkScheduleAssignment;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * API Penjadwalan operasional SPK — Step 4C.
 *
 * Catatan:
 * - `schedule_code` SELALU dibuat backend (SpkSchedule::generateNumber) dan
 *   tidak pernah dipercaya dari input frontend.
 * - Data induk SPK tidak disalin ke tabel schedule; cukup relasi `spk_id`.
 * - Tanggal aktual di sini adalah realisasi SESI/JADWAL, bukan pengganti
 *   installation_date / commissioning_date milik modul Commissioning.
 * - Tidak menyentuh stok inventory maupun tabel commissionings.
 */
class SpkScheduleController extends Controller
{
    private const EAGER_LOAD = ['spk.customer', 'assignments.employee', 'createdBy'];

    /**
     * Aturan validasi bersama store/update.
     *
     * @param  bool  $isUpdate  true = mode PUT (spk_id tidak boleh dipindah).
     */
    private function rules(bool $isUpdate = false): array
    {
        return [
            // spk_id tidak boleh diubah lewat edit.
            'spk_id'   => $isUpdate
                ? ['prohibited']
                : ['required', 'integer', 'exists:spks,id'],

            'planned_date'       => ['required', 'date'],
            'planned_start_time' => ['nullable', 'date_format:H:i'],
            'planned_end_time'   => ['nullable', 'date_format:H:i', 'after_or_equal:planned_start_time'],

            'actual_date'        => ['nullable', 'date'],
            'actual_start_time'  => ['nullable', 'date_format:H:i'],
            'actual_end_time'    => ['nullable', 'date_format:H:i'],

            'activity'      => ['required', 'string', 'max:255'],
            'activity_type' => ['nullable', Rule::in(SpkSchedule::ACTIVITY_TYPES)],
            'location'      => ['nullable', 'string', 'max:255'],
            'shift'         => ['nullable', 'string', 'max:50'],
            'priority'      => ['nullable', Rule::in(SpkSchedule::PRIORITIES)],
            'status'        => ['nullable', Rule::in(SpkSchedule::STATUSES)],
            'progress'      => ['nullable', 'integer', 'min:0', 'max:100'],

            // POSTPONED wajib punya alasan penundaan.
            'reschedule_reason' => [
                'nullable',
                'string',
                Rule::requiredIf(fn() => request('status') === SpkSchedule::STATUS_POSTPONED),
            ],

            'notes' => ['nullable', 'string'],

            'assignments'   => ['nullable', 'array'],
            'assignments.*.employee_id' => ['required', 'exists:employees,id'],
            'assignments.*.role'        => ['nullable', 'string', 'max:255'],
            'assignments.*.notes'       => ['nullable', 'string'],
        ];
    }

    /** GET /api/spk-schedules */
    public function index(Request $request)
    {
        $schedules = SpkSchedule::query()
            ->with(self::EAGER_LOAD)
            ->when($request->spk_id, fn($q) => $q->where('spk_id', $request->spk_id))
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->priority, fn($q) => $q->where('priority', $request->priority))
            ->when($request->employee_id, function ($q) use ($request) {
                $q->whereHas('assignments', fn($sub) => $sub->where('employee_id', $request->employee_id));
            })
            ->when($request->date_from, fn($q) => $q->whereDate('planned_date', '>=', $request->date_from))
            ->when($request->date_to, fn($q) => $q->whereDate('planned_date', '<=', $request->date_to))
            ->when($request->q, function ($q) use ($request) {
                $s = $request->q;
                $q->where(function ($sub) use ($s) {
                    $sub->where('schedule_code', 'like', "%$s%")
                        ->orWhere('activity', 'like', "%$s%")
                        ->orWhereHas('spk', function ($spk) use ($s) {
                            $spk->where('spk_number', 'like', "%$s%")
                                ->orWhere('project_name', 'like', "%$s%")
                                ->orWhere('serial_no', 'like', "%$s%");
                        });
                });
            })
            ->orderBy('planned_date')
            ->orderBy('id')
            ->get();

        return response()->json(['status' => 'success', 'data' => $schedules]);
    }

    /** GET /api/spk-schedules/{id} */
    public function show($id)
    {
        $schedule = SpkSchedule::with(self::EAGER_LOAD)->findOrFail($id);

        return response()->json(['status' => 'success', 'data' => $schedule]);
    }

    /** POST /api/spk-schedules */
    public function store(Request $request)
    {
        $data = $request->validate($this->rules());

        $spk = Spk::findOrFail($data['spk_id']);

        // SPK CANCELLED tidak boleh dijadwalkan.
        if ($spk->status === Spk::STATUS_CANCELLED) {
            throw ValidationException::withMessages([
                'spk_id' => 'SPK berstatus CANCELLED tidak dapat dijadwalkan.',
            ]);
        }

        $this->validateTimeWindows($data);
        $this->validatePlannedWithinSpk($spk, $data['planned_date']);
        $this->assertAssignmentsActive($data['assignments'] ?? []);

        try {
            DB::beginTransaction();

            $schedule = new SpkSchedule($this->headerAttributes($data, $spk));
            // schedule_code sengaja tidak ada di $fillable; set eksplisit.
            $schedule->forceFill([
                'schedule_code' => SpkSchedule::generateNumber($data['planned_date']),
                'created_by'    => $request->user()?->id,
            ]);
            $schedule->save();

            $this->syncAssignments($schedule, $data['assignments'] ?? []);
            $this->assertNoConflict($schedule, $data['assignments'] ?? []);

            DB::commit();
        } catch (ValidationException $e) {
            DB::rollBack();
            throw $e;
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Jadwal berhasil disimpan.',
            'data'    => $schedule->load(self::EAGER_LOAD),
        ], 201);
    }

    /** PUT /api/spk-schedules/{id} */
    public function update(Request $request, $id)
    {
        $schedule = SpkSchedule::findOrFail($id);

        // Schedule DONE tidak boleh diedit bebas.
        if ($schedule->status === SpkSchedule::STATUS_DONE) {
            throw ValidationException::withMessages([
                'status' => 'Jadwal berstatus DONE tidak dapat diedit.',
            ]);
        }

        $data = $request->validate($this->rules(true));

        $this->validateTimeWindows($data);
        $this->validatePlannedWithinSpk($schedule->spk, $data['planned_date']);
        $this->assertAssignmentsActive($data['assignments'] ?? []);

        try {
            DB::beginTransaction();

            // schedule_code & spk_id tidak pernah diubah di sini.
            $schedule->update($this->headerAttributes($data, $schedule->spk));

            // Sinkronisasi assignments bila key 'assignments' dikirim.
            if (array_key_exists('assignments', $data)) {
                $this->syncAssignments($schedule, $data['assignments'] ?? [], true);
            }
            $this->assertNoConflict(
                $schedule,
                $data['assignments'] ?? $schedule->assignments->map(fn($a) => ['employee_id' => $a->employee_id])->all()
            );

            DB::commit();
        } catch (ValidationException $e) {
            DB::rollBack();
            throw $e;
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Jadwal berhasil diperbarui.',
            'data'    => $schedule->fresh(self::EAGER_LOAD),
        ]);
    }

    /** DELETE /api/spk-schedules/{id} — hanya SCHEDULED / POSTPONED. */
    public function destroy($id)
    {
        $schedule = SpkSchedule::findOrFail($id);

        if (!in_array($schedule->status, SpkSchedule::DELETABLE_STATUSES, true)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Hanya jadwal berstatus SCHEDULED atau POSTPONED yang dapat dihapus. Status saat ini: ' . $schedule->status,
            ], 422);
        }

        $schedule->delete(); // SoftDeletes

        return response()->json(['status' => 'success', 'message' => 'Jadwal berhasil dihapus.']);
    }

    /** PATCH /api/spk-schedules/{id}/status */
    public function updateStatus(Request $request, $id)
    {
        $schedule = SpkSchedule::findOrFail($id);

        $data = $request->validate([
            'status' => ['required', Rule::in(SpkSchedule::STATUSES)],
            'reschedule_reason' => [
                'nullable',
                'string',
                Rule::requiredIf(fn() => $request->status === SpkSchedule::STATUS_POSTPONED),
            ],
        ]);

        $schedule->update([
            'status'            => $data['status'],
            'reschedule_reason' => $data['reschedule_reason'] ?? $schedule->reschedule_reason,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Status jadwal berhasil diperbarui.',
            'data'    => $schedule->fresh(self::EAGER_LOAD),
        ]);
    }

    /** PATCH /api/spk-schedules/{id}/progress — hanya mengubah progress. */
    public function updateProgress(Request $request, $id)
    {
        $schedule = SpkSchedule::findOrFail($id);

        $data = $request->validate([
            'progress' => ['required', 'integer', 'min:0', 'max:100'],
        ]);

        $schedule->update(['progress' => $data['progress']]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Progress jadwal berhasil diperbarui.',
            'data'    => $schedule->fresh(self::EAGER_LOAD),
        ]);
    }

    /* ── Helpers ── */

    /** Kolom header schedule (tanpa assignments / schedule_code / created_by). */
    private function headerAttributes(array $data, ?Spk $spk): array
    {
        return [
            'spk_id'             => $spk?->id,
            'planned_date'       => $data['planned_date'],
            'planned_start_time' => $data['planned_start_time'] ?? null,
            'planned_end_time'   => $data['planned_end_time'] ?? null,
            'actual_date'        => $data['actual_date'] ?? null,
            'actual_start_time'  => $data['actual_start_time'] ?? null,
            'actual_end_time'    => $data['actual_end_time'] ?? null,
            'activity'           => $data['activity'],
            'activity_type'      => $data['activity_type'] ?? SpkSchedule::ACTIVITY_WORK,
            // Lokasi kosong → pakai default dari SPK (lokasi tetap milik SPK).
            'location'           => $data['location'] ?? $spk?->location,
            'shift'              => $data['shift'] ?? null,
            'priority'           => $data['priority'] ?? SpkSchedule::PRIORITY_NORMAL,
            'status'             => $data['status'] ?? SpkSchedule::STATUS_SCHEDULED,
            'progress'           => $data['progress'] ?? 0,
            'reschedule_reason'  => $data['reschedule_reason'] ?? null,
            'notes'              => $data['notes'] ?? null,
        ];
    }

    /**
     * Validasi jam kerja (rencana & realisasi).
     * Laravel sudah menangani after_or_equal pada planned; di sini kita lengkapi
     * aturan actual + membatasi actual_* hanya untuk IN_PROGRESS / DONE.
     */
    private function validateTimeWindows(array $data): void
    {
        $status = $data['status'] ?? SpkSchedule::STATUS_SCHEDULED;

        $hasActual = !empty($data['actual_date'])
            || !empty($data['actual_start_time'])
            || !empty($data['actual_end_time']);

        if ($hasActual && !in_array($status, [SpkSchedule::STATUS_IN_PROGRESS, SpkSchedule::STATUS_DONE], true)) {
            throw ValidationException::withMessages([
                'actual_date' => 'Data realisasi (actual) hanya boleh diisi saat status IN_PROGRESS atau DONE.',
            ]);
        }

        if (
            !empty($data['actual_start_time']) && !empty($data['actual_end_time'])
            && $data['actual_end_time'] < $data['actual_start_time']
        ) {
            throw ValidationException::withMessages([
                'actual_end_time' => 'Waktu selesai aktual tidak boleh lebih awal dari waktu mulai aktual.',
            ]);
        }
    }

    /** planned_date sebaiknya berada dalam rentang start_date–finish_date SPK. */
    private function validatePlannedWithinSpk(?Spk $spk, string $plannedDate): void
    {
        if (!$spk) {
            return;
        }

        $planned = Carbon::parse($plannedDate)->startOfDay();

        if ($spk->start_date && $planned->lt(Carbon::parse($spk->start_date)->startOfDay())) {
            throw ValidationException::withMessages([
                'planned_date' => 'Tanggal rencana tidak boleh lebih awal dari Tanggal Mulai SPK (' . $spk->start_date->format('Y-m-d') . ').',
            ]);
        }

        if ($spk->finish_date && $planned->gt(Carbon::parse($spk->finish_date)->startOfDay())) {
            throw ValidationException::withMessages([
                'planned_date' => 'Tanggal rencana tidak boleh melewati Tanggal Selesai SPK (' . $spk->finish_date->format('Y-m-d') . ').',
            ]);
        }
    }

    /** Semua personel yang dipilih harus karyawan ACTIVE. */
    private function assertAssignmentsActive(array $assignments): void
    {
        if ($assignments === []) {
            return;
        }

        $ids = array_filter(array_map(fn($row) => $row['employee_id'] ?? null, $assignments));

        $inactive = Employee::whereIn('id', $ids)
            ->where('status', '!=', Employee::STATUS_ACTIVE)
            ->pluck('employee_name')
            ->all();

        if ($inactive !== []) {
            throw ValidationException::withMessages([
                'assignments' => 'Karyawan berikut tidak berstatus ACTIVE: ' . implode(', ', $inactive) . '.',
            ]);
        }
    }

    /**
     * Cek bentrok personel secara aplikasi (bukan UNIQUE database).
     *
     * Overlap dianggap terjadi bila: karyawan sama, SPK sama, tanggal rencana
     * sama, dan salah satu schedule tidak punya jam kerja (dianggap sehari penuh)
     * atau kedua rentang jam benar-benar beririsan.
     */
    private function assertNoConflict(SpkSchedule $schedule, array $assignments): void
    {
        if ($assignments === []) {
            return;
        }

        $employeeIds = array_filter(array_map(fn($row) => $row['employee_id'] ?? null, $assignments));

        $others = SpkSchedule::query()
            ->where('id', '!=', $schedule->id)
            ->where('spk_id', $schedule->spk_id)
            ->whereDate('planned_date', $schedule->planned_date)
            ->whereNotIn('status', [SpkSchedule::STATUS_CANCELLED, SpkSchedule::STATUS_POSTPONED])
            ->whereHas('assignments', fn($q) => $q->whereIn('employee_id', $employeeIds))
            ->with('assignments')
            ->get();

        foreach ($others as $other) {
            if ($this->timeOverlaps($schedule, $other)) {
                $names = Employee::whereIn(
                    'id',
                    $other->assignments->pluck('employee_id')->intersect($employeeIds)
                )->pluck('employee_name')->implode(', ');

                throw ValidationException::withMessages([
                    'assignments' => 'Personel berikut sudah memiliki jadwal lain pada tanggal dan jam yang sama: ' . $names . '.',
                ]);
            }
        }
    }

    /** Apakah dua schedule beririsan waktunya? */
    private function timeOverlaps(SpkSchedule $a, SpkSchedule $b): bool
    {
        // Tanpa jam → anggap seharian, pastilah bentrok pada tanggal yang sama.
        if (
            !$a->planned_start_time || !$a->planned_end_time
            || !$b->planned_start_time || !$b->planned_end_time
        ) {
            return true;
        }

        return $a->planned_start_time < $b->planned_end_time
            && $b->planned_start_time < $a->planned_end_time;
    }

    /**
     * Sinkronisasi daftar personel schedule ini.
     *
     * @param  bool  $force  true = selalu ganti (dipakai saat update agar bisa
     *                       mengosongkan daftar dengan mengirim assignments: []).
     */
    private function syncAssignments(SpkSchedule $schedule, array $assignments, bool $force = false): void
    {
        if ($assignments === [] && !$force) {
            return;
        }

        $schedule->assignments()->delete();

        foreach ($assignments as $row) {
            SpkScheduleAssignment::create([
                'spk_schedule_id' => $schedule->id,
                'employee_id'     => $row['employee_id'],
                'role'            => $row['role'] ?? null,
                'notes'           => $row['notes'] ?? null,
            ]);
        }

        $schedule->unsetRelation('assignments');
    }
}
