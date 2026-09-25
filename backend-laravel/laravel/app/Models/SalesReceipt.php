<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesReceipt extends Model
{
    use HasFactory;

    protected $fillable = [
        'form_no',
        'payment_date',
        'bill_to_no',
        'name',
        'cheque_no',
        'cheque_date',
        'amount',
        'reconciled',
        'description'
    ];

    // Mengubah tipe data 'reconciled' menjadi boolean saat ditarik dari database
    protected $casts = [
        'reconciled' => 'boolean',
    ];
}