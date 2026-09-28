<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Warehouse extends Model
{
    use HasFactory;
    protected $fillable = ['code', 'name', 'address', 'status'];
    public function locations()
    {
        return $this->hasMany(WarehouseLocation::class);
    }
}
