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
}
