<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Services\DocumentNumberService;
use Illuminate\Support\Carbon;

class Customer extends Model
{
    use HasFactory;

    protected static function booted(): void
    {
        static::creating(function (Customer $customer) {
            if (blank($customer->customer_code)) {
                $customer->customer_code = app(DocumentNumberService::class)
                    ->nextCustomerCode(Carbon::now());
            }
        });
    }

    protected $fillable = [
        'customer_code',
        'customer_name',
        'phone',
        'email',
        'address',
        'status',
    ];

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function partNumbers()
    {
        return $this->hasMany(CustomerPartNumber::class);
    }
}