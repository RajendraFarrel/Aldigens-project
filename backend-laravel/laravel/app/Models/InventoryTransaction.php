<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'transaction_type',
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
}
