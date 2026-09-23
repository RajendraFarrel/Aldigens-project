<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesOrder extends Model
{
    use HasFactory;

    protected $table = 'sales_orders';
    protected $guarded = ['id'];

    // Relasi ke Quotation asal
    public function quotation()
    {
        return $this->belongsTo(Quotation::class, 'quotation_id');
    }

    // Relasi ke item-item SO
    public function items()
    {
        return $this->hasMany(SalesOrderItem::class, 'sales_order_id');
    }

    // Relasi ke Delivery Order (Surat Jalan) yang lahir dari SO ini
    public function deliveryOrders()
    {
        return $this->hasMany(DeliveryOrder::class, 'sales_order_id');
    }

    // Relasi ke Invoice yang menerbitkan tagihan dari SO ini
    public function invoices()
    {
        return $this->hasMany(Invoice::class, 'sales_order_id');
    }
}
