import api from './api';

/* ------------------------------------------------------------------
 * Modul Akuntansi
 * Semua data diambil dari backend. Tidak ada mock data untuk transaksi.
 * ------------------------------------------------------------------ */

// --- Chart of Account ---
export const getAccounts = (params = {}) =>
    api.get('/accounting/accounts', { params });

export const createAccount = (data) =>
    api.post('/accounting/accounts', data);

export const updateAccount = (id, data) =>
    api.put(`/accounting/accounts/${id}`, data);

export const toggleAccountStatus = (id) =>
    api.patch(`/accounting/accounts/${id}/toggle-status`);

// --- Journal Voucher ---
export const getVouchers = (params = {}) =>
    api.get('/accounting/vouchers', { params });

export const getVoucher = (id) =>
    api.get(`/accounting/vouchers/${id}`);

export const createVoucher = (data) =>
    api.post('/accounting/vouchers', data);

export const updateVoucher = (id, data) =>
    api.put(`/accounting/vouchers/${id}`, data);

export const deleteVoucher = (id) =>
    api.delete(`/accounting/vouchers/${id}`);

export const postVoucher = (id) =>
    api.post(`/accounting/vouchers/${id}/post`);

export const reverseVoucher = (id, alasan) =>
    api.post(`/accounting/vouchers/${id}/reverse`, { alasan });

/* ------------------------------------------------------------------
 * Modul Kas & Bank
 * Saldo selalu dibaca dari backend (COA saldo_awal + jurnal POSTED).
 * Transaksi dicatat sebagai Journal Voucher existing lalu diposting.
 * ------------------------------------------------------------------ */

export const getCashBanks = (params = {}) =>
    api.get('/accounting/cash-banks', { params });

export const getCashBank = (id) =>
    api.get(`/accounting/cash-banks/${id}`);

export const createCashBank = (data) =>
    api.post('/accounting/cash-banks', data);

export const updateCashBank = (id, data) =>
    api.put(`/accounting/cash-banks/${id}`, data);

export const deleteCashBank = (id) =>
    api.delete(`/accounting/cash-banks/${id}`);

export const toggleCashBankStatus = (id) =>
    api.patch(`/accounting/cash-banks/${id}/toggle-status`);

/** Akun COA (Aset, detail, aktif) yang belum dipasangkan ke master. */
export const getAkunTersediaUntukCashBank = () =>
    api.get('/accounting/cash-banks/akun-tersedia');

export const getCashBankSaldoAwal = () =>
    api.get('/accounting/cash-banks/saldo-awal');

export const simpanCashBankSaldoAwal = (id, data) =>
    api.put(`/accounting/cash-banks/${id}/saldo-awal`, data);

export const getCashBankRingkasan = (params = {}) =>
    api.get('/accounting/cash-banks/ringkasan', { params });

export const getCashBankMutasi = (params = {}) =>
    api.get('/accounting/cash-banks/mutasi', { params });

/** Semua transaksi Kas & Bank menjadi satu Journal Voucher POSTED. */
export const createCashBankPenerimaan = (data) =>
    api.post('/accounting/cash-bank/penerimaan', data);

export const createCashBankPengeluaran = (data) =>
    api.post('/accounting/cash-bank/pengeluaran', data);

export const createCashBankTransfer = (data) =>
    api.post('/accounting/cash-bank/transfer', data);

/* ------------------------------------------------------------------
 * Modul Utang Piutang
 * Piutang & utang dibaca dari invoice asli; pembayaran tersimpan di backend
 * dan menghasilkan Journal Voucher (bukan localStorage).
 * ------------------------------------------------------------------ */

export const getRpRingkasan = (params = {}) =>
    api.get('/accounting/receivables-payables/ringkasan', { params });

export const getPiutang = (params = {}) =>
    api.get('/accounting/receivables-payables/piutang', { params });

export const getUtang = (params = {}) =>
    api.get('/accounting/receivables-payables/utang', { params });

export const getRpAging = (params = {}) =>
    api.get('/accounting/receivables-payables/aging', { params });

/**
 * Master customer & supplier untuk filter/form Utang Piutang.
 * Kontrak backend: { customers: [...], suppliers: [...] } (array datar, tanpa `data`).
 * `onSettled` dipakai agar customer yang berhasil dimuat tetap dipakai walau
 * supplier gagal (dan sebaliknya) — satu endpoint gagal tidak menutup semuanya.
 */
export const getRpCustomers = () =>
    api.get('/accounting/receivables-payables/master', { params: { only: 'customers' } });

export const getRpSuppliers = () =>
    api.get('/accounting/receivables-payables/master', { params: { only: 'suppliers' } });

export const getRpMaster = (params = {}) =>
    api.get('/accounting/receivables-payables/master', { params });

export const getPenerimaanCustomer = (params = {}) =>
    api.get('/accounting/receivables-payables/penerimaan', { params });

export const createPenerimaanCustomer = (data) =>
    api.post('/accounting/receivables-payables/penerimaan', data);

export const getPembayaranSupplier = (params = {}) =>
    api.get('/accounting/receivables-payables/pembayaran', { params });

export const createPembayaranSupplier = (data) =>
    api.post('/accounting/receivables-payables/pembayaran', data);

// --- Purchase Invoice (tagihan supplier) ---
export const getPurchaseInvoices = (params = {}) =>
    api.get('/purchase-invoices', { params });

export const getPurchaseInvoice = (id) =>
    api.get(`/purchase-invoices/${id}`);

export const createPurchaseInvoice = (data) =>
    api.post('/purchase-invoices', data);

export const deletePurchaseInvoice = (id) =>
    api.delete(`/purchase-invoices/${id}`);

export const postPurchaseInvoice = (id) =>
    api.post(`/purchase-invoices/${id}/post`);

/** Posting invoice penjualan ke jurnal (piutang + pendapatan). */
export const postSalesInvoiceJournal = (id) =>
    api.post(`/invoices/${id}/post-jurnal`);

/** Status pembayaran piutang/utang. */
export const PAYMENT_STATUS = ['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'];

export const PAYMENT_STATUS_LABEL = {
    UNPAID: 'Belum Dibayar',
    PARTIALLY_PAID: 'Dibayar Sebagian',
    PAID: 'Lunas',
    OVERDUE: 'Terlambat',
};

// --- Laporan (sumber: jurnal POSTED) ---
export const getAccountingSummary = () =>
    api.get('/accounting/reports/summary');

export const getJournalUmum = (params = {}) =>
    api.get('/accounting/reports/journal-umum', { params });

export const getBukuBesar = (params = {}) =>
    api.get('/accounting/reports/buku-besar', { params });

export const getNeracaSaldo = (params = {}) =>
    api.get('/accounting/reports/neraca-saldo', { params });

export const getLabaRugi = (params = {}) =>
    api.get('/accounting/reports/laba-rugi', { params });

export const getNeraca = (params = {}) =>
    api.get('/accounting/reports/neraca', { params });

/* ------------------------------------------------------------------
 * Konstanta & util bersama modul Akuntansi
 * ------------------------------------------------------------------ */

export const ACCOUNT_TYPES = ['Aset', 'Liabilitas', 'Ekuitas', 'Pendapatan', 'Beban'];

export const VOUCHER_TYPES = [
    'Voucher Pembelian',
    'Voucher Bank Keluar',
    'Voucher Bank Masuk',
    'Voucher Kas',
    'Voucher Penjualan',
    'Voucher Beban',
    'Transfer Kas/Bank',
    'Jurnal Umum',
    'Jurnal Penyesuaian',
];

/** Template dokumen Aldigens -> kolom header khusus. */
export const VOUCHER_TEMPLATES = {
    'Voucher Pembelian': [
        { key: 'pihak_terkait', label: 'Supplier', type: 'text' },
        { key: 'kas_bank', label: 'Kas / Bank', type: 'text' },
        { key: 'no_referensi', label: 'PO Number', type: 'text' },
    ],
    'Voucher Bank Keluar': [
        { key: 'pihak_terkait', label: 'Dibayar Kepada', type: 'text' },
        { key: 'kas_bank', label: 'Kas / Bank', type: 'text' },
    ],
    'Voucher Bank Masuk': [
        { key: 'pihak_terkait', label: 'Diterima Dari', type: 'text' },
        { key: 'kas_bank', label: 'Kas / Bank', type: 'text' },
    ],
    'Voucher Kas': [
        { key: 'pihak_terkait', label: 'Dibayar Kepada', type: 'text' },
        { key: 'kas_bank', label: 'Kas', type: 'text' },
    ],
    'Voucher Penjualan': [
        { key: 'pihak_terkait', label: 'Dijual Kepada', type: 'text' },
        { key: 'no_referensi', label: 'No. Invoice / SO', type: 'text' },
    ],
    'Voucher Beban': [
        { key: 'pihak_terkait', label: 'Penerima Beban', type: 'text' },
        { key: 'kas_bank', label: 'Kas / Bank', type: 'text' },
    ],
    'Transfer Kas/Bank': [
        { key: 'kas_bank', label: 'Kas / Bank Sumber → Tujuan', type: 'text' },
        { key: 'pihak_terkait', label: 'Diterima Kas/Bank', type: 'text' },
    ],
};

export const rupiah = (n) =>
    'Rp ' + Number(n || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const angka = (n) => Number(n || 0).toLocaleString('id-ID');

export const formatTanggal = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatTanggalPanjang = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

/** Default saldo normal per tipe akun. */
export const SALDO_NORMAL_BY_TIPE = {
    Aset: 'Debit',
    Beban: 'Debit',
    Liabilitas: 'Kredit',
    Ekuitas: 'Kredit',
    Pendapatan: 'Kredit',
};

/**
 * Tanggal lokal (bukan UTC) dalam format 'YYYY-MM-DD'.
 *
 * JANGAN memakai `new Date(...).toISOString().slice(0, 10)`: toISOString()
 * mengonversi ke UTC, sehingga di WIB (UTC+7) tanggal pukul 00:00-06:59
 * periode default berakhir di KEMARIN dan jurnal hari ini hilang dari rekap
 * (total debit/kredit 0 -> status "TIDAK BALANCE").
 */
export const toLocalISODate = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

export const todayISODate = () => toLocalISODate(new Date());

export const periodeDefault = () => {
    const now = new Date();
    return {
        from: toLocalISODate(new Date(now.getFullYear(), 0, 1)),
        to: toLocalISODate(now),
    };
};