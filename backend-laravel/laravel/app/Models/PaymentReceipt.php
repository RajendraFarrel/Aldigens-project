<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Penerimaan pembayaran dari customer (pelunasan piutang). */
class PaymentReceipt extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'payment_date' => 'date',
        'amount'       => 'float',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function cashBank()
    {
        return $this->belongsTo(CashBank::class, 'cash_bank_id');
    }

    public function allocations()
    {
        return $this->hasMany(PaymentReceiptAllocation::class, 'payment_receipt_id');
    }

    public function journalVoucher()
    {
        return $this->belongsTo(JournalVoucher::class, 'journal_voucher_id');
    }
}
