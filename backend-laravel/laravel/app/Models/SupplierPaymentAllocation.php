<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Alokasi satu pembayaran ke satu purchase invoice. */
class SupplierPaymentAllocation extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'amount' => 'float',
    ];

    public function payment()
    {
        return $this->belongsTo(SupplierPayment::class, 'supplier_payment_id');
    }

    public function purchaseInvoice()
    {
        return $this->belongsTo(PurchaseInvoice::class, 'purchase_invoice_id');
    }
}
