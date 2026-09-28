<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseRequest extends Model
{
    protected $fillable = ['document_number', 'request_date', 'requester_id', 'supplier_id', 'request_type', 'notes', 'status', 'created_by', 'approved_by', 'approved_at'];
    protected $casts = ['request_date' => 'date', 'approved_at' => 'datetime'];
    public function items()
    {
        return $this->hasMany(PurchaseRequestItem::class);
    }
    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requester_id');
    }
}
