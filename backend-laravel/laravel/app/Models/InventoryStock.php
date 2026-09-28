<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryStock extends Model
{
    use HasFactory;
    protected $fillable = ['product_id', 'warehouse_id', 'warehouse_location_id', 'quantity'];
    protected $casts = ['quantity' => 'integer'];
    public function product()
    {
        return $this->belongsTo(Product::class);
    }
    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }
    public function location()
    {
        return $this->belongsTo(WarehouseLocation::class, 'warehouse_location_id');
    }
}
