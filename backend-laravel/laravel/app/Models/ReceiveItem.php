<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReceiveItem extends Model
{
    protected $fillable = [
        'document_number', 
        'receive_date', 
        'supplier_id', 
        'purchase_order_id', 
        'warehouse_id',
        'delivery_order',
        'spk_supplier',
        'status', 
        'notes', 
        'created_by'
    ];
    
    public function items()
    {
        return $this->hasMany(ReceiveItemLine::class);
    }
}