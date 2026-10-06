<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Penugasan satu karyawan pada satu SPK. Step 3A.
 *
 * Daftar karyawan TIDAK disimpan sebagai satu string di tabel `spks`.
 */
class SpkAssignment extends Model
{
    use HasFactory;

    protected $table = 'spk_assignments';

    protected $fillable = [
        'spk_id',
        'employee_id',
        'assignment_role',
        'notes',
    ];

    public function spk()
    {
        return $this->belongsTo(Spk::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
