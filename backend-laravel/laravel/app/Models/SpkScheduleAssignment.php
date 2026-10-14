<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Penugasan satu karyawan pada satu schedule. Step 4C.
 *
 * Daftar personel TIDAK disimpan sebagai string di tabel `spk_schedules`;
 * relasi ke master `employees` dijaga lewat pivot ini.
 */
class SpkScheduleAssignment extends Model
{
    use HasFactory;

    protected $table = 'spk_schedule_assignments';

    protected $fillable = [
        'spk_schedule_id',
        'employee_id',
        'role',
        'notes',
    ];

    public function spkSchedule()
    {
        return $this->belongsTo(SpkSchedule::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
