<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Pembayaran ke supplier (pelunasan utang usaha). */
class SupplierPayment extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'payment_date' => 'date',
        'amount'       => 'float',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function cashBank()
    {
        return $this->belongsTo(CashBank::class, 'cash_bank_id');
    }

    public function allocations()
    {
        return $this->hasMany(SupplierPaymentAllocation::class, 'supplier_payment_id');
    }

    public function journalVoucher()
    {
        return $this->belongsTo(JournalVoucher::class, 'journal_voucher_id');
    }
}
