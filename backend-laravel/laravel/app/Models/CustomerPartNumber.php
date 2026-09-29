<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerPartNumber extends Model
{
    protected $fillable = ['customer_id', 'part_number', 'item_description', 'selling_price', 'status'];
    protected $casts = ['selling_price' => 'decimal:2'];

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }
}
