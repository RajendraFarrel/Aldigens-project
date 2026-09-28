<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockOpnameItem extends Model
{
    use HasFactory;
    protected $fillable = ['stock_opname_id', 'product_id', 'warehouse_location_id', 'system_quantity', 'physical_quantity', 'difference', 'notes'];
    protected $casts = ['system_quantity' => 'integer', 'physical_quantity' => 'integer', 'difference' => 'integer'];
    public function product()
    {
        return $this->belongsTo(Product::class);
    }
    public function opname()
    {
        return $this->belongsTo(StockOpname::class, 'stock_opname_id');
    }
}
