<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Production extends Model
{
           protected $fillable = ['document_number', 'bom_id', 'production_date', 'quantity', 'status', 'created_by', 'notes'];
           protected $casts = ['production_date' => 'date', 'quantity' => 'decimal:3'];
           public function bom()
           {
                      return $this->belongsTo(Bom::class);
           }
           public function items()
           {
                      return $this->hasMany(ProductionItem::class);
           }
}
