<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GoodsReceipt extends Model
{
    protected $guarded = ['id'];

    public function items()
    {
        return $this->hasMany(GoodsReceiptItem::class);
    }
}