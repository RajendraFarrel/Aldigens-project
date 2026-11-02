<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerPartNumber extends Model
{
<<<<<<< HEAD
    protected $fillable = ['customer_id', 'part_number', 'item_description', 'selling_price', 'status', 'inventory_product_id'];
=======
    // Tambahkan 'inventory_part_number' di sini
    protected $fillable = [
        'customer_id', 
        'part_number', 
        'inventory_part_number', // <--- Jembatan ke Inventory
        'item_description', 
        'selling_price', 
        'status'
    ];
    
>>>>>>> 61048b72cc2a8218dc1c07fc8c7f7bfd85786091
    protected $casts = ['selling_price' => 'decimal:2'];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
<<<<<<< HEAD

    /**
     * Produk Inventory internal yang dipetakan ke Part Number Customer ini.
     * Mapping bersifat opsional: NULL berarti "Belum Terhubung".
     */
    public function inventoryProduct()
    {
        return $this->belongsTo(Product::class, 'inventory_product_id');
    }
}
=======
}
>>>>>>> 61048b72cc2a8218dc1c07fc8c7f7bfd85786091
