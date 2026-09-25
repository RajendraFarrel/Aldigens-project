<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesReturn extends Model
{
    use HasFactory;

    protected $fillable = [
        'return_no', 
        'date', 
        'customer_id', 
        'invoice_id', 
        'amount', 
        'description'
    ];

    // Relasi ke tabel Customer
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    // Relasi ke tabel Invoice
    public function invoice()
    {
        return $this->belongsTo(SalesInvoice::class);
    }

    // Jika retur punya banyak baris barang, buat juga SalesReturnItem
    public function items()
    {
        return $this->hasMany(SalesReturnItem::class);
    }
}
