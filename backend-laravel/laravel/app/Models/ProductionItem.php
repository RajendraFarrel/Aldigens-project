<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductionItem extends Model
{
           protected $fillable = ['production_id', 'product_id', 'direction', 'quantity', 'unit'];
           protected $casts = ['quantity' => 'decimal:3'];
           public function product()
           {
                      return $this->belongsTo(Product::class);
           }
}
