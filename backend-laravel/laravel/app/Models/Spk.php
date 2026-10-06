<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * SPK (Surat Perintah Kerja) — data induk pekerjaan operasional. Step 3A.
 *
 * Nomor SPK dibuat otomatis oleh backend dengan format SPK/YYYY/MM/NNNN.
 */
class Spk extends Model
{
    use HasFactory;

    protected $table = 'spks';

    /** Lifecycle SPK. */
    public const STATUS_DRAFT       = 'DRAFT';
    public const STATUS_OPEN        = 'OPEN';
    public const STATUS_IN_PROGRESS = 'IN_PROGRESS';
    public const STATUS_COMPLETED   = 'COMPLETED';
    public const STATUS_CANCELLED   = 'CANCELLED';

    public const STATUSES = [
        self::STATUS_DRAFT,
        self::STATUS_OPEN,
        self::STATUS_IN_PROGRESS,
        self::STATUS_COMPLETED,
        self::STATUS_CANCELLED,
    ];

    protected $fillable = [
        // spk_number sengaja TIDAK ada di fillable:
        // nomor dibuat backend, bukan diterima dari frontend.
        'spk_date',
        'customer_id',
        'po_number',
        'so_number',
        'do_number',
        'project_name',
        'serial_no',
        'location',
        'start_date',
        'finish_date',
        'contractor',
        'project_leader',
        'pic_ehs',
        'person_responsible',
        'employee_count',
        'security_monitoring',
        'notes',
        'status',
    ];

    protected $casts = [
        'spk_date'    => 'date',
        'start_date'  => 'date',
        'finish_date' => 'date',
    ];

    /** Customer / Project Owner. */
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /** Penugasan karyawan pada SPK ini. */
    public function assignments()
    {
        return $this->hasMany(SpkAssignment::class);
    }

    /** Checklist EHS / Permit pada SPK ini. */
    public function ehsPermits()
    {
        return $this->hasMany(SpkEhsPermit::class);
    }

    /**
     * Generate nomor SPK berikutnya: SPK/YYYY/MM/NNNN.
     *
     * Nomor ditentukan dari spk_date (fallback ke tanggal hari ini) sehingga
     * mengikuti tahun & bulan dokumen, bukan tanggal pembuatan record.
     */
    public static function generateNumber(\DateTimeInterface|string|null $date = null): string
    {
        $date = $date ? \Illuminate\Support\Carbon::parse($date) : now();
        $prefix = sprintf('SPK/%s/%s/', $date->format('Y'), $date->format('m'));

        $lastNumber = static::query()
            ->where('spk_number', 'like', $prefix . '%')
            ->orderByDesc('spk_number')
            ->value('spk_number');

        $lastSequence = $lastNumber ? (int) substr($lastNumber, strlen($prefix)) : 0;

        return $prefix . str_pad($lastSequence + 1, 4, '0', STR_PAD_LEFT);
    }
}
