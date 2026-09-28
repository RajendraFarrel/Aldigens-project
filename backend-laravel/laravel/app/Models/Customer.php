<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;
    protected $fillable = ['customer_code', 'customer_name', 'address', 'phone', 'email', 'status'];

    public function products()
    {
        return $this->hasMany(Product::class);
    }
}
