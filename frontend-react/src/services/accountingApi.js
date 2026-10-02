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

export const todayISODate = () => new Date().toISOString().slice(0, 10);

export const periodeDefault = () => {
    const now = new Date();
    return {
        from: new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10),
        to: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString().slice(0, 10),
    };
};