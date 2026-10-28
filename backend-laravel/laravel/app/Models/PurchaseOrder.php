<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PurchaseOrder extends Model
{
    protected $fillable = [
    'po_number',
    'customer_po_number',
    'date',
    'customer_name',
    'customer_address',
    'subject',
    'terms',      // <-- Pastikan ini ada
    'ship_via',   // <-- Pastikan ini ada
    'sub_total',
    'tax_amount',
    'tax_percentage',
    'grand_total',
    'tax_code',
    'status'
];

    protected $casts = [
        'date' => 'date',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(PurchaseOrderItem::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_name', 'name');
    }

    public function receiveItem(): HasOne
    {
        return $this->hasOne(ReceiveItem::class, 'purchase_order_id');
    }
}
