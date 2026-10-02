<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JournalVoucher extends Model
{
    /** Jenis voucher yang didukung sistem. */
    public const JENIS = [
        'Voucher Pembelian',
        'Voucher Bank Keluar',
        'Voucher Bank Masuk',
        'Voucher Kas',
        'Voucher Penjualan',
        'Voucher Beban',
        'Jurnal Umum',
        'Jurnal Penyesuaian',
    ];

    protected $guarded = ['id'];

    protected $casts = [
        'tanggal'      => 'date',
        'total_debit'  => 'float',
        'total_kredit' => 'float',
        'posted_at'    => 'datetime',
        'approved_at'  => 'datetime',
        'voided_at'    => 'datetime',
    ];

    public function lines()
    {
        return $this->hasMany(JournalLine::class, 'journal_voucher_id')->orderBy('line_order');
    }

    public function reversalOf()
    {
        return $this->belongsTo(self::class, 'reversal_of_id');
    }

    public function reversal()
    {
        return $this->hasOne(self::class, 'reversal_of_id');
    }

    public function isPosted()
    {
        return $this->status === 'POSTED';
    }

    /** @return float Total debit - total kredit (0 berarti balanced). */
    public function selisih()
    {
        return round($this->total_debit - $this->total_kredit, 2);
    }
}
