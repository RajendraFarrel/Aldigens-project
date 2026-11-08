<?php

namespace App\Http\Controllers;

use App\Services\CashBankService;
use Illuminate\Http\Request;

/**
 * Ringkasan & Mutasi Kas/Bank.
 * Sumber data: journal_lines + journal_vouchers POSTED (tanpa ledger kedua).
 */
class CashBankReportController extends Controller
{
    public function __construct(private CashBankService $service) {}

    /** Ringkasan seluruh kas/bank untuk periode filter. */
    public function ringkasan(Request $request)
    {
        return response()->json($this->service->ringkasan([
            'from' => $request->query('from'),
            'to'   => $request->query('to'),
        ]));
    }

    /** Mutasi satu kas/bank + saldo berjalan. */
    public function mutasi(Request $request)
    {
        $validator = validator($request->query(), [
            'cash_bank_id' => ['required', 'integer', 'exists:cash_banks,id'],
            'from'         => ['nullable', 'date'],
            'to'           => ['nullable', 'date'],
            'jenis'        => ['nullable', 'string'],
            'search'       => ['nullable', 'string', 'max:191'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors(),
            ], 422);
        }

        return response()->json($this->service->mutasi((int) $request->query('cash_bank_id'), [
            'from'   => $request->query('from'),
            'to'     => $request->query('to'),
            'jenis'  => $request->query('jenis'),
            'search' => $request->query('search'),
        ]));
    }
}
