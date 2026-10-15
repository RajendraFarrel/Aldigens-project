<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReceiveItem extends Model
{
<<<<<<< HEAD
    /**
     * Kolom sesuai skema tabel `receive_items`:
     * document_number, receive_date, supplier_id, purchase_order_id,
     * warehouse_id, delivery_order, spk_supplier, status, notes, created_by.
     */
=======
<<<<<<< HEAD
           protected $fillable = ['document_number', 'receive_date', 'vendor_name', 'po_ref', 'supplier_id', 'purchase_order_id', 'warehouse_id', 'status', 'notes', 'created_by'];
           protected $casts = ['receive_date' => 'date'];
           public function items()
                   {
                              return $this->hasMany(ReceiveItemLine::class);
                   }
}
=======
    // Tambahkan 'delivery_order' dan 'spk_supplier' ke dalam array ini
>>>>>>> 7c884ac67d259c58448c0de8c19d7fd3b5e482f3
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
>>>>>>> 791cde976e81c37ebfa6340787232644d6015c14
