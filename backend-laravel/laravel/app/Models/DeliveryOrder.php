<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeliveryOrder extends Model
{
    use HasFactory;

    protected $table = 'delivery_orders';
    protected $guarded = ['id'];

    // Relasi ke Sales Order
    public function salesOrder()
    {
        return $this->belongsTo(SalesOrder::class, 'sales_order_id');
    }

    // Relasi ke item DO
    public function items()
    {
        return $this->hasMany(DeliveryOrderItem::class, 'delivery_order_id');
    }

    // Relasi ke Invoice yang menerbitkan tagihan dari DO ini
    public function invoices()
    {
        return $this->hasMany(Invoice::class, 'delivery_order_id');
    }
}
