<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JournalLine extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'debit'  => 'float',
        'kredit' => 'float',
    ];

    public function voucher()
    {
        return $this->belongsTo(JournalVoucher::class, 'journal_voucher_id');
    }

    public function account()
    {
        return $this->belongsTo(Account::class, 'account_id');
    }
}
