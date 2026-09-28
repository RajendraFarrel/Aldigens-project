<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReceiveItemLine extends Model
{
           protected $table = 'receive_item_items';
           protected $fillable = ['receive_item_id', 'product_id', 'quantity', 'unit'];
           protected $casts = ['quantity' => 'decimal:3'];
           public function product()
           {
                      return $this->belongsTo(Product::class);
           }
}
