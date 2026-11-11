<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CapitalEntry extends Model
{
    protected $fillable = [
        'entry_date',
        'type',
        'amount',
        'cash_bank_id',
        'description',
    ];

    protected $casts = [
        'entry_date' => 'date:Y-m-d',
        'amount'     => 'float',
    ];
}