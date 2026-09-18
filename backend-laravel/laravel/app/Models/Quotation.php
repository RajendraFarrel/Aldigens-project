<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Quotation extends Model
{
    use HasFactory;

    // Buka gembok agar semua kolom bisa diisi
    protected $guarded = []; 

    // Relasi: Satu Quotation punya banyak QuotationItem
    public function items()
    {
        return $this->hasMany(QuotationItem::class);
    }
}