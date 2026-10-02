<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\JournalVoucher;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class JournalVoucherController extends Controller
{
    /** Prefix nomor voucher per jenis (bagian belakang tanggal diisi tahun). */
    private const PREFIX = [
        'Voucher Pembelian'    => 'VP',
        'Voucher Bank Keluar'  => 'VBK',
        'Voucher Bank Masuk'   => 'VBM',
        'Voucher Kas'          => 'VK',
        'Voucher Penjualan'    => 'VJ',
        'Voucher Beban'        => 'VBN',
        'Jurnal Umum'          => 'JV',
        'Jurnal Penyesuaian'   => 'JP',
    ];

    // ---------------------------------------------------------------
    // CRUD
    // ---------------------------------------------------------------

    public function index(Request $request)
    {
        $vouchers = JournalVoucher::with('lines')
            ->when($request->query('status'), fn($q, $s) => $q->where('status', $s))
            ->when($request->query('jenis'), fn($q, $j) => $q->where('jenis', $j))
            ->when($request->query('tipe'), fn($q, $t) => $q->where('tipe', $t))
            ->when($request->query('search'), function ($q, $s) {
                $q->where(function ($w) use ($s) {
                    $w->where('no_voucher', 'like', "%{$s}%")
                        ->orWhere('keterangan', 'like', "%{$s}%")
                        ->orWhere('no_referensi', 'like', "%{$s}%");
                });
            })
            ->when($request->query('from'), fn($q, $d) => $q->whereDate('tanggal', '>=', $d))
            ->when($request->query('to'), fn($q, $d) => $q->whereDate('tanggal', '<=', $d))
            ->orderByDesc('tanggal')
            ->orderByDesc('id')
            ->paginate((int) $request->query('per_page', 50));

        return response()->json($vouchers);
    }

    public function show(JournalVoucher $journalVoucher)
    {
        return response()->json($journalVoucher->load('lines'));
    }

    public function store(Request $request, array $data = [])
    {
        $data = $this->validated($request, $data);

        $lines = $this->validateLines($data['lines']);

        $voucher = DB::transaction(function () use ($request, $data, $lines) {
            $voucher = JournalVoucher::create([
                'no_voucher'     => $this->generateNoVoucher($data['jenis'], $data['tanggal']),
                'tanggal'        => $data['tanggal'],
                'jenis'          => $data['jenis'],
                'keterangan'     => $data['keterangan'] ?? null,
                'no_referensi'   => $data['no_referensi'] ?? null,
                'pihak_terkait'  => $data['pihak_terkait'] ?? null,
                'kas_bank'       => $data['kas_bank'] ?? null,
                'status'         => 'DRAFT',
                'tipe'           => $data['jenis'] === 'Jurnal Penyesuaian' ? 'PENYESUAIAN' : 'VOUCHER',
                'total_debit'    => $lines['total_debit'],
                'total_kredit'   => $lines['total_kredit'],
                'created_by'     => $request->user()?->id,
            ]);

            $this->syncLines($voucher, $lines['rows']);

            return $voucher;
        });

        return response()->json($voucher->load('lines'), 201);
    }

    /** Edit hanya untuk voucher DRAFT. Voucher POSTED terkunci. */
    public function update(Request $request, JournalVoucher $journalVoucher, array $data = [])
    {
        $data = $this->validated($request, $data);

        if ($journalVoucher->status !== 'DRAFT') {
            return response()->json([
                'message' => "Voucher {$journalVoucher->no_voucher} sudah diposting dan tidak dapat diedit. Gunakan Void/Reversal.",
            ], 422);
        }

        $lines = $this->validateLines($data['lines']);

        $voucher = DB::transaction(function () use ($journalVoucher, $data, $lines) {
            $journalVoucher->update([
                'tanggal'       => $data['tanggal'],
                'jenis'         => $data['jenis'],
                'keterangan'    => $data['keterangan'] ?? null,
                'no_referensi'  => $data['no_referensi'] ?? null,
                'pihak_terkait' => $data['pihak_terkait'] ?? null,
                'kas_bank'      => $data['kas_bank'] ?? null,
                'total_debit'   => $lines['total_debit'],
                'total_kredit'  => $lines['total_kredit'],
            ]);

            $this->syncLines($journalVoucher, $lines['rows']);

            return $journalVoucher;
        });

        return response()->json($voucher->fresh()->load('lines'));
    }

    /** Hapus hanya draft. */
    public function destroy(JournalVoucher $journalVoucher)
    {
        if ($journalVoucher->status !== 'DRAFT') {
            return response()->json([
                'message' => "Voucher {$journalVoucher->no_voucher} sudah diposting dan tidak dapat dihapus.",
            ], 422);
        }

        $journalVoucher->delete();

        return response()->json(['message' => 'Voucher draft dihapus.']);
    }

    // ---------------------------------------------------------------
    // Posting
    // ---------------------------------------------------------------

    /**
     * Posting voucher. Idempoten & aman terhadap request ganda:
     * baris dikunci (lockForUpdate) di dalam transaksi, dan status
     * diperiksa ulang sebelum jurnal dianggap terjadi.
     */
    public function post(Request $request, JournalVoucher $journalVoucher)
    {
        $result = DB::transaction(function () use ($journalVoucher, $request) {
            $voucher = JournalVoucher::whereKey($journalVoucher->id)
                ->lockForUpdate()
                ->first();

            if (! $voucher) {
                return ['status' => 404, 'message' => 'Voucher tidak ditemukan.'];
            }

            // Sudah diposting / dibatalkan -> tolak, jangan post dua kali.
            if ($voucher->status !== 'DRAFT') {
                return [
                    'status' => 422,
                    'message' => "Voucher {$voucher->no_voucher} berstatus {$voucher->status} dan tidak dapat diposting lagi.",
                    'voucher' => $voucher->load('lines'),
                ];
            }

            $lines = $voucher->lines()->get();

            if ($lines->isEmpty()) {
                return ['status' => 422, 'message' => 'Voucher tidak memiliki detail akun.'];
            }

            // Validasi ulang saat posting (akun bisa saja dinonaktifkan setelah draft).
            $accountIds = $lines->pluck('account_id')->unique();
            $inactive = Account::whereIn('id', $accountIds)
                ->where(fn($q) => $q->where('is_active', false)->orWhere('is_header', true))
                ->pluck('nomor_akun');

            if ($inactive->isNotEmpty()) {
                return [
                    'status' => 422,
                    'message' => "Posting dibatalkan. Akun tidak aktif/tidak dapat dipilih: {$inactive->implode(', ')}.",
                ];
            }

            $totalDebit  = round($lines->sum('debit'), 2);
            $totalKredit = round($lines->sum('kredit'), 2);

            if ($totalDebit <= 0 || $totalKredit <= 0) {
                return ['status' => 422, 'message' => 'Nominal debit dan kredit harus lebih dari nol.'];
            }

            if (abs($totalDebit - $totalKredit) > 0.009) {
                return [
                    'status' => 422,
                    'message' => 'Voucher tidak seimbang. Total Debit harus sama dengan Total Kredit.',
                    'total_debit' => $totalDebit,
                    'total_kredit' => $totalKredit,
                    'selisih' => round($totalDebit - $totalKredit, 2),
                ];
            }

            $voucher->update([
                'status'        => 'POSTED',
                'total_debit'   => $totalDebit,
                'total_kredit'  => $totalKredit,
                'posted_at'     => now(),
                'posted_by'     => $request->user()?->id,
                'approved_at'   => $voucher->approved_at ?? now(),
                'approved_by'   => $voucher->approved_by ?? $request->user()?->id,
            ]);

            return ['status' => 200, 'message' => "Voucher {$voucher->no_voucher} berhasil diposting.", 'voucher' => $voucher->load('lines')];
        });

        if ($result['status'] !== 200) {
            return response()->json($result, $result['status']);
        }

        return response()->json($result);
    }

    /** Batalkan posting: jangan ubah histori, buat voucher reversal bertanda. */
    public function reverse(Request $request, JournalVoucher $journalVoucher, array $data = [])
    {
        $payload = $data ?: $request->all();

        $validator = validator($payload, [
            'alasan' => ['required', 'string', 'max:500'],
        ], [], ['alasan' => 'Alasan Reversal']);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors(),
            ], 422);
        }

        $alasan = $payload['alasan'];

        $result = DB::transaction(function () use ($journalVoucher, $alasan, $request) {
            $voucher = JournalVoucher::whereKey($journalVoucher->id)->lockForUpdate()->first();

            if (! $voucher || $voucher->status !== 'POSTED') {
                return ['status' => 422, 'message' => 'Hanya voucher berstatus POSTED yang dapat direversal.'];
            }

            if ($voucher->reversal()->exists()) {
                return ['status' => 422, 'message' => 'Voucher ini sudah pernah direversal.'];
            }

            $journalVoucher->update([
                'status'     => 'VOID',
                'voided_at'  => now(),
                'voided_by'  => $request->user()?->id,
                'void_alasan' => $alasan,
            ]);

            // Voucher pembalik: nilai dibalik, tetap POSTED agar histori tetap utuh.
            $rev = JournalVoucher::create([
                'no_voucher'    => $this->generateNoVoucher($journalVoucher->jenis, $journalVoucher->tanggal),
                'tanggal'       => now()->toDateString(),
                'jenis'         => $journalVoucher->jenis,
                'keterangan'    => "REVERSAL dari {$journalVoucher->no_voucher} — {$alasan}",
                'no_referensi'  => $journalVoucher->no_referensi,
                'pihak_terkait' => $journalVoucher->pihak_terkait,
                'kas_bank'      => $journalVoucher->kas_bank,
                'status'        => 'POSTED',
                'tipe'          => $journalVoucher->tipe,
                'total_debit'   => $journalVoucher->total_kredit,
                'total_kredit'  => $journalVoucher->total_debit,
                'reversal_of_id' => $journalVoucher->id,
                'created_by'    => $request->user()?->id,
                'posted_at'     => now(),
                'posted_by'     => $request->user()?->id,
            ]);

            foreach ($journalVoucher->lines()->get() as $line) {
                $rev->lines()->create([
                    'account_id'   => $line->account_id,
                    'nomor_akun'   => $line->nomor_akun,
                    'nama_akun'    => $line->nama_akun,
                    'debit'        => $line->kredit,
                    'kredit'       => $line->debit,
                    'memo'         => $line->memo ? "Reversal: {$line->memo}" : 'Reversal',
                    'line_order'   => $line->line_order,
                ]);
            }

            return ['status' => 200, 'message' => "Reversal berhasil dibuat: {$rev->no_voucher}", 'voucher' => $rev->load('lines')];
        });

        if ($result['status'] !== 200) {
            return response()->json($result, $result['status']);
        }

        return response()->json($result);
    }

    // ---------------------------------------------------------------
    // Helper
    // ---------------------------------------------------------------

    /**
     * Nomor voucher otomatis & unik, contoh: VP-2026-0007.
     * Unik dijamin oleh unique index + pengecekan ulang.
     */
    private function generateNoVoucher(string $jenis, string $tanggal): string
    {
        $prefix = self::PREFIX[$jenis] ?? 'JV';
        $tahun  = substr($tanggal, 0, 4);

        for ($attempt = 0; $attempt < 20; $attempt++) {
            $last = JournalVoucher::where('no_voucher', 'like', "{$prefix}-{$tahun}-%")
                ->orderByDesc('id')
                ->value('no_voucher');

            $next = $last
                ? ((int) Str::afterLast($last, '-')) + 1
                : 1;

            $candidate = sprintf('%s-%s-%04d', $prefix, $tahun, $next);

            if (! JournalVoucher::where('no_voucher', $candidate)->exists()) {
                return $candidate;
            }
        }

        return sprintf('%s-%s-%s', $prefix, $tahun, Str::upper(Str::random(6)));
    }

    /**
     * Sumber data diprioritaskan dari argumen $data (dipakai oleh pemanggil
     * internal/uji), lalu dari body request. Semua field wajib tetap divalidasi.
     */
    private function validated(Request $request, array $data): array
    {
        $payload = $data ?: $request->all();

        $validator = validator($payload, [
            'tanggal'       => ['required', 'date'],
            'jenis'         => ['required', 'string', 'in:' . implode(',', JournalVoucher::JENIS)],
            'keterangan'    => ['nullable', 'string', 'max:1000'],
            'no_referensi'  => ['nullable', 'string', 'max:191'],
            'pihak_terkait' => ['nullable', 'string', 'max:191'],
            'kas_bank'      => ['nullable', 'string', 'max:191'],
            'lines'         => ['required', 'array', 'min:2'],
            'lines.*.account_id' => ['required', 'integer', 'exists:accounts,id'],
            'lines.*.debit'     => ['nullable', 'numeric', 'min:0'],
            'lines.*.kredit'    => ['nullable', 'numeric', 'min:0'],
            'lines.*.memo'      => ['nullable', 'string', 'max:255'],
        ], [], [
            'tanggal' => 'Tanggal',
            'jenis'   => 'Jenis Voucher',
            'lines'   => 'Detail Transaksi',
        ]);

        if ($validator->fails()) {
            abort(response()->json([
                'message' => $validator->errors()->first(),
                'errors'  => $validator->errors(),
            ], 422));
        }

        return $validator->validated();
    }

    /**
     * Validasi baris jurnal di backend:
     * akun harus ada & selectable, tiap baris tidak boleh debit & kredit
     * bersamaan, dan total harus seimbang.
     */
    private function validateLines(array $lines): array
    {
        $accountIds = collect($lines)->pluck('account_id')->unique();
        $accounts = Account::whereIn('id', $accountIds)->get()->keyBy('id');

        $errors = [];
        $rows = [];
        $totalDebit = 0.0;
        $totalKredit = 0.0;

        foreach ($lines as $i => $line) {
            $no = $i + 1;
            $account = $accounts[$line['account_id']] ?? null;

            if (! $account) {
                $errors["lines.$i.account_id"] = "Baris {$no}: akun tidak ditemukan.";
                continue;
            }
            if (! $account->is_active) {
                $errors["lines.$i.account_id"] = "Baris {$no}: akun {$account->nomor_akun} berstatus Nonaktif.";
                continue;
            }
            if ($account->is_header) {
                $errors["lines.$i.account_id"] = "Baris {$no}: {$account->nomor_akun} adalah akun induk, tidak dapat dipilih.";
                continue;
            }

            $debit  = round((float) ($line['debit'] ?? 0), 2);
            $kredit = round((float) ($line['kredit'] ?? 0), 2);

            if ($debit < 0 || $kredit < 0) {
                $errors["lines.$i.debit"] = "Baris {$no}: nominal tidak boleh negatif.";
                continue;
            }
            if ($debit > 0 && $kredit > 0) {
                $errors["lines.$i.debit"] = "Baris {$no}: satu baris tidak boleh berisi debit dan kredit sekaligus.";
                continue;
            }
            if ($debit == 0 && $kredit == 0) {
                $errors["lines.$i.debit"] = "Baris {$no}: nominal debit atau kredit harus diisi.";
                continue;
            }

            $totalDebit += $debit;
            $totalKredit += $kredit;

            $rows[] = [
                'account_id' => $account->id,
                'nomor_akun' => $account->nomor_akun,
                'nama_akun'  => $account->nama_akun,
                'debit'      => $debit,
                'kredit'     => $kredit,
                'memo'       => $line['memo'] ?? null,
                'line_order' => $i,
            ];
        }

        if ($totalDebit <= 0 || $totalKredit <= 0) {
            $errors['lines'] = 'Minimal harus ada satu baris debit dan satu baris kredit dengan nominal lebih dari nol.';
        }

        // Catatan: voucher DRAFT boleh disimpan belum seimbang agar bisa
        // dikerjakan bertahap. Pemeriksaan ketat dilakukan saat posting
        // (lihat post()) supaya pengguna tetap melihat selisih di form.

        if ($errors) {
            abort(response()->json([
                'message' => implode(' ', array_values($errors)),
                'errors'  => $errors,
                'total_debit'  => round($totalDebit, 2),
                'total_kredit' => round($totalKredit, 2),
                'selisih' => round($totalDebit - $totalKredit, 2),
            ], 422));
        }

        return [
            'rows'         => $rows,
            'total_debit'  => round($totalDebit, 2),
            'total_kredit' => round($totalKredit, 2),
        ];
    }

    private function syncLines(JournalVoucher $voucher, array $rows): void
    {
        $voucher->lines()->delete();
        $voucher->lines()->createMany($rows);
    }
}
