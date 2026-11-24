<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Asset extends Model
{
    protected $fillable = [
        'code',
        'name',
        'category',
        'type',
        'acquisition_date',
        'acquisition_cost',
        'current_value',
        'cash_bank_id',
        'status',
        'notes',
    ];

    protected $casts = [
        'acquisition_date' => 'date:Y-m-d',
        'acquisition_cost' => 'float',
        'current_value'    => 'float',
    ];

    // Nilai buku: pakai nilai saat ini, kalau kosong pakai nilai perolehan
    public function getBookValueAttribute(): float
    {
        return $this->current_value ?? $this->acquisition_cost;
    }

    protected $appends = ['book_value'];
}