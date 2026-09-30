<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CommissioningItem extends Model
{
    use HasFactory;

    protected $table = 'commissioning_items';

    protected $fillable = [
        'commissioning_id',
        'check_item',
        'result',
        'remarks',
    ];

    // Relasi ke Header Commissioning
    public function commissioning()
    {
        return $this->belongsTo(Commissioning::class);
    }
}