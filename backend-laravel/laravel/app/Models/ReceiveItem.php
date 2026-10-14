<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReceiveItem extends Model
{
    // Tambahkan 'delivery_order' dan 'spk_supplier' ke dalam array ini
    protected $fillable = [
        'document_number', 
        'receive_date', 
        'supplier_id', 
        'purchase_order_id', 
        'warehouse_id',
        'delivery_order', // <--- Kolom baru untuk DO
        'spk_supplier',   // <--- Kolom baru untuk SPK
        'status', 
        'notes', 
        'created_by'
    ];
    
    protected $casts = [
        'receive_date' => 'date'
    ];
    
    public function items()
    {
        return $this->hasMany(ReceiveItemLine::class);
    }
}