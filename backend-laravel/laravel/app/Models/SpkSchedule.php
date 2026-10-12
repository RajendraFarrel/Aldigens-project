<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * Jadwal operasional SPK — Step 4C.
 *
 * Satu baris = satu sesi/hari kerja (multi-hari ⇒ banyak baris).
 *
 * Prinsip:
 * - Data induk SPK TIDAK disalin ke tabel ini; cukup relasi `spk_id`.
 * - Tanggal aktual di sini adalah realisasi SESI/JADWAL, BUKAN pengganti
 *   `installation_date` / `commissioning_date` milik modul Commissioning.
 * - `schedule_code` selalu dibuat backend (SCH/YYYY/MM/NNNN) dan tidak pernah
 *   diterima dari frontend.
 */
class SpkSchedule extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'spk_schedules';

    /** Status lifecycle schedule. */
    public const STATUS_SCHEDULED   = 'SCHEDULED';
    public const STATUS_IN_PROGRESS = 'IN_PROGRESS';
    public const STATUS_DONE        = 'DONE';
    public const STATUS_POSTPONED   = 'POSTPONED';
    public const STATUS_CANCELLED   = 'CANCELLED';

    public const STATUSES = [
        self::STATUS_SCHEDULED,
        self::STATUS_IN_PROGRESS,
        self::STATUS_DONE,
        self::STATUS_POSTPONED,
        self::STATUS_CANCELLED,
    ];

    /** Status yang masih boleh dihapus. */
    public const DELETABLE_STATUSES = [
        self::STATUS_SCHEDULED,
        self::STATUS_POSTPONED,
    ];

    /** Prioritas schedule. */
    public const PRIORITY_LOW    = 'LOW';
    public const PRIORITY_NORMAL = 'NORMAL';
    public const PRIORITY_HIGH   = 'HIGH';
    public const PRIORITY_URGENT = 'URGENT';

    public const PRIORITIES = [
        self::PRIORITY_LOW,
        self::PRIORITY_NORMAL,
        self::PRIORITY_HIGH,
        self::PRIORITY_URGENT,
    ];

    /** Jenis aktivitas (penanda; tanggal aktual instalasi/commissioning tetap di Commissioning). */
    public const ACTIVITY_WORK          = 'WORK';
    public const ACTIVITY_INSTALLATION  = 'INSTALLATION';
    public const ACTIVITY_COMMISSIONING = 'COMMISSIONING';
    public const ACTIVITY_OTHER         = 'OTHER';

    public const ACTIVITY_TYPES = [
        self::ACTIVITY_WORK,
        self::ACTIVITY_INSTALLATION,
        self::ACTIVITY_COMMISSIONING,
        self::ACTIVITY_OTHER,
    ];

    protected $fillable = [
        // schedule_code sengaja TIDAK ada di fillable:
        // nomor dibuat backend, bukan diterima dari frontend.
        'spk_id',
        'planned_date',
        'planned_start_time',
        'planned_end_time',
        'actual_date',
        'actual_start_time',
        'actual_end_time',
        'activity',
        'activity_type',
        'location',
        'shift',
        'priority',
        'status',
        'progress',
        'reschedule_reason',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'planned_date' => 'date',
        'actual_date'  => 'date',
        'progress'     => 'integer',
    ];

    /** SPK induk jadwal ini. */
    public function spk()
    {
        return $this->belongsTo(Spk::class);
    }

    /** Akun login yang membuat jadwal. */
    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Daftar personel pada sesi ini. */
    public function assignments()
    {
        return $this->hasMany(SpkScheduleAssignment::class);
    }

    /**
     * Generate nomor schedule berikutnya: SCH/YYYY/MM/NNNN.
     *
     * Nomor ditentukan dari planned_date (fallback ke tanggal hari ini) sehingga
     * mengikuti tahun & bulan jadwal, bukan tanggal pembuatan record.
     *
     * Memakai withTrashed() agar nomor yang pernah dipakai (soft deleted)
     * tidak digenerate ulang dan tetap unik.
     */
    public static function generateNumber(\DateTimeInterface|string|null $date = null): string
    {
        $date = $date ? Carbon::parse($date) : now();
        $prefix = sprintf('SCH/%s/%s/', $date->format('Y'), $date->format('m'));

        $lastNumber = static::withTrashed()
            ->where('schedule_code', 'like', $prefix . '%')
            ->orderByDesc('schedule_code')
            ->value('schedule_code');

        $lastSequence = $lastNumber ? (int) substr($lastNumber, strlen($prefix)) : 0;

        return $prefix . str_pad($lastSequence + 1, 4, '0', STR_PAD_LEFT);
    }
}
