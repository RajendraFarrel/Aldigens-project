<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Bom extends Model
{
    protected $fillable = ['document_number', 'product_id', 'output_quantity', 'unit', 'status', 'notes', 'created_by'];
    protected $casts = ['output_quantity' => 'decimal:3'];
    public function product()
    {
        return $this->belongsTo(Product::class);
    }
    public function items() { return $this->hasMany(BomItem::class); }
    public function productions() { return $this->hasMany(Production::class); }
}
