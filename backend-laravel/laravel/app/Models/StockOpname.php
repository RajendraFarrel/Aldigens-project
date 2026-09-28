<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockOpname extends Model
{
    use HasFactory;
    protected $fillable = ['document_number', 'opname_date', 'warehouse_id', 'status', 'created_by', 'approved_by', 'approved_at', 'notes'];
    protected $casts = ['opname_date' => 'date', 'approved_at' => 'datetime'];
    public function items()
    {
        return $this->hasMany(StockOpnameItem::class);
    }
    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }
}
