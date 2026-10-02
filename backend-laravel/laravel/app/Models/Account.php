<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'is_active'   => 'boolean',
        'is_header'   => 'boolean',
        'saldo_awal'  => 'float',
    ];

    public function lines()
    {
        return $this->hasMany(JournalLine::class, 'account_id');
    }

    /** Hanya akun detail yang boleh dipilih pada form jurnal. */
    public function scopeSelectable($query)
    {
        return $query->where('is_active', true)->where('is_header', false);
    }
}
