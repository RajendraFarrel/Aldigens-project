<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Item checklist EHS / Permit pada SPK. Step 3A.
 *
 * Struktur detail (bukan kolom boolean terpisah) agar item seperti
 * Safe Work Permit, Area Entry Permit, Hot Work Permit, EHS Induction,
 * Other Permit, dan Demarcation, serta Security Monitoring, dapat
 * direpresentasikan tanpa mengubah skema.
 *
 * Tidak ada workflow approval EHS pada tahap ini.
 */
class SpkEhsPermit extends Model
{
    use HasFactory;

    protected $table = 'spk_ehs_permits';

    /** Jenis item standar dari dokumen SPK Aldigens. */
    public const TYPE_SPK            = 'SPK';
    public const TYPE_SAFE_WORK      = 'SAFE_WORK_PERMIT';
    public const TYPE_AREA_ENTRY     = 'AREA_ENTRY_PERMIT';
    public const TYPE_HOT_WORK       = 'HOT_WORK_PERMIT';
    public const TYPE_EHS_INDUCTION  = 'EHS_INDUCTION';
    public const TYPE_OTHER_PERMIT   = 'OTHER_PERMIT';
    public const TYPE_DEMARCATION    = 'DEMARCATION';
    public const TYPE_SECURITY_MONITORING = 'SECURITY_MONITORING';

    public const TYPES = [
        self::TYPE_SPK,
        self::TYPE_SAFE_WORK,
        self::TYPE_AREA_ENTRY,
        self::TYPE_HOT_WORK,
        self::TYPE_EHS_INDUCTION,
        self::TYPE_OTHER_PERMIT,
        self::TYPE_DEMARCATION,
        self::TYPE_SECURITY_MONITORING,
    ];

    public const STATUS_PENDING   = 'PENDING';
    public const STATUS_SUBMITTED = 'SUBMITTED';
    public const STATUS_APPROVED  = 'APPROVED';
    public const STATUS_REJECTED  = 'REJECTED';
    public const STATUS_NA        = 'NA';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_SUBMITTED,
        self::STATUS_APPROVED,
        self::STATUS_REJECTED,
        self::STATUS_NA,
    ];

    protected $fillable = [
        'spk_id',
        'item_type',
        'item_name',
        'status',
        'notes',
    ];

    public function spk()
    {
        return $this->belongsTo(Spk::class);
    }
}
