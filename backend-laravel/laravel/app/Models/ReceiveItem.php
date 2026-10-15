<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReceiveItem extends Model
{
    /**
     * Kolom sesuai skema tabel `receive_items`:
     * document_number, receive_date, supplier_id, purchase_order_id,
     * warehouse_id, delivery_order, spk_supplier, status, notes, created_by.
     */
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
        'created_by',
    ];

    protected $casts = [
        'receive_date' => 'date',
    ];

    public function items()
    {
        return $this->hasMany(ReceiveItemLine::class, 'receive_item_id');
    }
}