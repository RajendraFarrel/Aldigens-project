<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Commissioning extends Model
{
    use HasFactory;

    protected $table = 'commissionings';

    protected $fillable = [
    'commissioning_code',
    'customer_id',
    'project_name',
    'do_number',
    'so_number',
    'ref_po',
    'unit_model',       // <-- Pastikan ada
    'serial_no',         // <-- Pastikan ada
    'installation_date', // <-- Pastikan ada
    'commissioning_date',
    'technician_name',
    'status',
    'notes',
];

    // Relasi ke Customer
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    // Relasi ke Item Checklist
    public function items()
    {
        return $this->hasMany(CommissioningItem::class);
    }
}