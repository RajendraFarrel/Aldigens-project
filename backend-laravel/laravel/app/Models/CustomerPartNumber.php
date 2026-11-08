<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerPartNumber extends Model
{
    protected $fillable = ['customer_id', 'part_number', 'item_description', 'selling_price', 'status', 'inventory_product_id'];
    protected $casts = ['selling_price' => 'decimal:2'];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    /**
     * Produk Inventory internal yang dipetakan ke Part Number Customer ini.
     * Mapping bersifat opsional: NULL berarti "Belum Terhubung".
     */
    public function inventoryProduct()
    {
        return $this->belongsTo(Product::class, 'inventory_product_id');
    }
}
