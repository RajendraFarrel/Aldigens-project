<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ReceiveItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'receive_no',
        'date',
        'vendor_name',
        'po_ref',
        'delivery_order', // <--- Kolom baru
        'spk_supplier',   // <--- Kolom baru
        'status',
        'notes',
    ];
}