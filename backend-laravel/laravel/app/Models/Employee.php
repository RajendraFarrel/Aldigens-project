<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Master personel lapangan (karyawan). Terpisah dari `users` yang khusus
 * akun/login sistem. Step 3A.
 *
 * Satu employee dapat ditugaskan ke banyak SPK.
 */
class Employee extends Model
{
    use HasFactory;

    protected $table = 'employees';

    public const STATUS_ACTIVE   = 'ACTIVE';
    public const STATUS_INACTIVE = 'INACTIVE';

    public const STATUSES = [
        self::STATUS_ACTIVE,
        self::STATUS_INACTIVE,
    ];

    protected $fillable = [
        'employee_code',
        'employee_name',
        'position',
        'department',
        'phone',
        'status',
        'notes',
    ];

    /** Penugasan pada SPK. */
    public function spkAssignments()
    {
        return $this->hasMany(SpkAssignment::class);
    }

    /** Generate kode karyawan berikutnya: EMP-0001. */
    public static function generateCode(): string
    {
        $lastCode = static::query()
            ->where('employee_code', 'like', 'EMP-%')
            ->orderByDesc('employee_code')
            ->value('employee_code');

        $lastSequence = $lastCode ? (int) substr($lastCode, 4) : 0;

        return 'EMP-' . str_pad($lastSequence + 1, 4, '0', STR_PAD_LEFT);
    }
}
