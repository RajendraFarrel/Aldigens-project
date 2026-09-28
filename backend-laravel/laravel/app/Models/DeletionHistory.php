<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeletionHistory extends Model
{
    use HasFactory;
    protected $fillable = ['document_type', 'document_id', 'document_number', 'deleted_by', 'reason', 'snapshot', 'deleted_at'];
    protected $casts = ['snapshot' => 'array', 'deleted_at' => 'datetime'];
}
