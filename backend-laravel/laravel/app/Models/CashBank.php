<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\ValidationException;

/**
 * Master Kas & Bank.
 *
 * Metadata saja — saldo dibaca dari Account::saldo_awal + jurnal POSTED.
 * Satu akun COA hanya boleh dipasangkan sekali (unique account_id).
 */
class CashBank extends Model
{
    public const JENIS = ['KAS', 'BANK'];

    protected $table = 'cash_banks';

    protected $guarded = ['id'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function account()
    {
        return $this->belongsTo(Account::class, 'account_id');
    }

    /** Hanya master aktif yang boleh dipakai transaksi baru. */
    public function scopeAktif($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Validasi aturan pemilihan akun COA untuk master Kas/Bank:
     * harus ada, tipe Aset, akun detail (bukan header), dan aktif saat didaftarkan.
     *
     * @throws ValidationException
     */
    public static function assertAccountEligible(?Account $account, string $field = 'account_id'): Account
    {
        if (! $account) {
            throw ValidationException::withMessages([$field => 'Akun COA tidak ditemukan.']);
        }

        if ($account->tipe_akun !== 'Aset') {
            throw ValidationException::withMessages([
                $field => "Akun {$account->nomor_akun} bertipe {$account->tipe_akun}. Kas/Bank hanya dapat memakai akun tipe Aset.",
            ]);
        }

        if ($account->is_header) {
            throw ValidationException::withMessages([
                $field => "Akun {$account->nomor_akun} adalah akun induk (header) dan tidak dapat dipakai sebagai Kas/Bank.",
            ]);
        }

        if (! $account->is_active) {
            throw ValidationException::withMessages([
                $field => "Akun {$account->nomor_akun} berstatus Nonaktif. Aktifkan akun di Chart of Account terlebih dahulu.",
            ]);
        }

        return $account;
    }

    /**
     * Jumlah voucher POSTED yang memengaruhi akun ini.
     * Dipakai untuk melindungi saldo awal agar tidak diubah diam-diam.
     */
    public function postedVoucherCount(): int
    {
        return JournalVoucher::where('status', 'POSTED')
            ->whereHas('lines', fn($q) => $q->where('account_id', $this->account_id))
            ->count();
    }
}
