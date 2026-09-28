<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WarehouseLocation extends Model
{
    use HasFactory;
    protected $fillable = ['warehouse_id', 'code', 'name', 'status'];
    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }
}
