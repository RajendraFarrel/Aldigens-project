<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Tagihan dari supplier (sumber tunggal utang usaha).
 *
 * Tidak menyimpan saldo: sisa utang = grand_total - total alokasi pembayaran
 * yang sudah POSTED.
 */
class PurchaseInvoice extends Model
{
    protected $guarded = ['id'];

    protected $casts = [
        'invoice_date'   => 'date',
        'due_date'       => 'date',
        'sub_total'      => 'float',
        'tax_percentage' => 'float',
        'tax_amount'     => 'float',
        'grand_total'    => 'float',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class, 'supplier_id');
    }

    public function items()
    {
        return $this->hasMany(PurchaseInvoiceItem::class, 'purchase_invoice_id');
    }

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    public function allocations()
    {
        return $this->hasMany(SupplierPaymentAllocation::class, 'purchase_invoice_id');
    }

    public function journalVoucher()
    {
        return $this->belongsTo(JournalVoucher::class, 'journal_voucher_id');
    }

    public function debitAccount()
    {
        return $this->belongsTo(Account::class, 'debit_account_id');
    }
}
