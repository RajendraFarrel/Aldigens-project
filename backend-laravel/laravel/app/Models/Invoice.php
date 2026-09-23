<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $table = 'invoices';
    protected $guarded = ['id'];

    protected $casts = [
        'invoice_date'   => 'date',
        'due_date'       => 'date',
        'sub_total'      => 'float',
        'tax_percentage' => 'float',
        'tax_amount'     => 'float',
        'grand_total'    => 'float',
    ];

    // Invoice dibuat berdasarkan Sales Order (sumber harga)
    public function salesOrder()
    {
        return $this->belongsTo(SalesOrder::class, 'sales_order_id');
    }

    // Invoice menyertakan bukti pengiriman (Delivery Order)
    public function deliveryOrder()
    {
        return $this->belongsTo(DeliveryOrder::class, 'delivery_order_id');
    }

    // Rincian item tagihan
    public function items()
    {
        return $this->hasMany(InvoiceItem::class, 'invoice_id');
    }
}
