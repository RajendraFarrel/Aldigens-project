<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Alokasi satu penerimaan ke satu invoice penjualan. */
class PaymentReceiptAllocation extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'amount' => 'float',
    ];

    public function receipt()
    {
        return $this->belongsTo(PaymentReceipt::class, 'payment_receipt_id');
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }
}
