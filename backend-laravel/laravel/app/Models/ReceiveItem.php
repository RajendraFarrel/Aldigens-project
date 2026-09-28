<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReceiveItem extends Model
{
           protected $fillable = ['document_number', 'receive_date', 'supplier_id', 'purchase_order_id', 'warehouse_id', 'status', 'notes', 'created_by'];
           protected $casts = ['receive_date' => 'date'];
           public function items()
                   {
                              return $this->hasMany(ReceiveItemLine::class);
                   }
}
