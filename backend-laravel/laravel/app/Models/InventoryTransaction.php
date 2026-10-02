<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'group_key',
        'product_id',
        'user_id',
        'warehouse_id',
        'warehouse_location_id',
        'reference_type',
        'reference_id',
        'reference_number',
        'transaction_type',
        'transfer_direction',
        'quantity',
        'stock_before',
        'stock_after',
        'user_name',
        'client_pc',
        'notes',
        'transaction_time',
    ];

    protected $casts = [
        'quantity'     => 'integer',
        'stock_before' => 'integer',
        'stock_after'  => 'integer',
        'transaction_time' => 'datetime',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function location()
    {
        return $this->belongsTo(WarehouseLocation::class, 'warehouse_location_id');
    }
}
