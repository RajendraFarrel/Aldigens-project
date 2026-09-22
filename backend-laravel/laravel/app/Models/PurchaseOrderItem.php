<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseOrderItem extends Model
{
    // Mengizinkan semua kolom diisi massal kecuali 'id'
    protected $guarded = ['id'];

    /**
     * Relasi balik ke Purchase Order induk
     */
    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }
    
    // Relasi product() dihapus karena sistem menggunakan input manual (teks) 
    // tanpa tabel inventaris produk terpisah.
}