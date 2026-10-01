/**
 * Data contoh (mock) untuk Modul Akuntansi.
 * Tujuan: showcasing halaman & alur cetak siap didemokan sebelum logika
 * akuntansi otomatis (COA live, posting, trial balance otomatis) dibuat.
 */

export const ACCOUNT_TYPES = ['Aset', 'Liabilitas', 'Ekuitas', 'Pendapatan', 'Beban'];

export const TRANSACTION_TYPES = [
  'Penjualan',
  'Pembelian',
  'Kas / Bank',
  'Hutang / Piutang',
  'Beban',
  'Aset dll',
];

/** Chart of Account — mengikuti alur siklus akuntansi Accurate 4. */
export const CHART_OF_ACCOUNTS = [
  { id: 1, kode: '1-1000', nama: 'Kas', tipe: 'Aset', saldoNormal: 'Debit', status: 'Aktif', parent: '1-0000' },
  { id: 2, kode: '1-1010', nama: 'Bank BCA', tipe: 'Aset', saldoNormal: 'Debit', status: 'Aktif', parent: '1-0000' },
  { id: 3, kode: '1-1020', nama: 'Piutang Usaha', tipe: 'Aset', saldoNormal: 'Debit', status: 'Aktif', parent: '1-0000' },
  { id: 4, kode: '1-1030', nama: 'Persediaan / Inventori', tipe: 'Aset', saldoNormal: 'Debit', status: 'Aktif', parent: '1-0000' },
  { id: 5, kode: '1-2010', nama: 'Hutang Usaha', tipe: 'Liabilitas', saldoNormal: 'Kredit', status: 'Aktif', parent: '2-0000' },
  { id: 6, kode: '2-1000', nama: 'Hutang Bank / Pinjaman', tipe: 'Liabilitas', saldoNormal: 'Kredit', status: 'Aktif', parent: '2-0000' },
  { id: 7, kode: '3-1000', nama: 'Modal Pemilik', tipe: 'Ekuitas', saldoNormal: 'Kredit', status: 'Aktif', parent: '3-0000' },
  { id: 8, kode: '3-2000', nama: 'Laba Ditahan', tipe: 'Ekuitas', saldoNormal: 'Kredit', status: 'Aktif', parent: '3-0000' },
  { id: 9, kode: '4-1000', nama: 'Pendapatan Penjualan', tipe: 'Pendapatan', saldoNormal: 'Kredit', status: 'Aktif', parent: '4-0000' },
  { id: 10, kode: '4-2000', nama: 'Pendapatan Lain-lain', tipe: 'Pendapatan', saldoNormal: 'Kredit', status: 'Nonaktif', parent: '4-0000' },
  { id: 11, kode: '5-1000', nama: 'Harga Pokok Penjualan', tipe: 'Beban', saldoNormal: 'Debit', status: 'Aktif', parent: '5-0000' },
  { id: 12, kode: '5-2000', nama: 'Beban Gaji & Tunjangan', tipe: 'Beban', saldoNormal: 'Debit', status: 'Aktif', parent: '5-0000' },
  { id: 13, kode: '5-3000', nama: 'Beban Sewa', tipe: 'Beban', saldoNormal: 'Debit', status: 'Aktif', parent: '5-0000' },
  { id: 14, kode: '5-4000', nama: 'Beban Utilitas', tipe: 'Beban', saldoNormal: 'Debit', status: 'Aktif', parent: '5-0000' },
];

export const accountByKode = (kode) => CHART_OF_ACCOUNTS.find((a) => a.kode === kode);

/** Daftar Journal Voucher. */
export const JOURNAL_VOUCHERS = [
  {
    id: 1,
    noVoucher: 'JV-2026-001',
    tanggal: '2026-01-05',
    jenis: 'Kas / Bank',
    keterangan: 'Penerimaan pembayaran piutang usaha PT Sinar Abadi',
    status: 'Posted',
    dibuatOleh: 'Admin',
    lines: [
      { kode: '1-1000', memo: 'Penerimaan kas', debit: 75000000, kredit: 0 },
      { kode: '1-1020', memo: 'Penerimaan bank', debit: 25000000, kredit: 0 },
      { kode: '1-1030', memo: 'Piutang usaha', debit: 0, kredit: 100000000 },
    ],
  },
  {
    id: 2,
    noVoucher: 'JV-2026-002',
    tanggal: '2026-01-08',
    jenis: 'Penjualan',
    keterangan: 'Penjualan part number ke PT Mitra Teknik',
    status: 'Posted',
    dibuatOleh: 'Admin',
    lines: [
      { kode: '1-1030', memo: 'Piutang usaha', debit: 425000000, kredit: 0 },
      { kode: '4-1000', memo: 'Pendapatan penjualan', debit: 0, kredit: 425000000 },
    ],
  },
  {
    id: 3,
    noVoucher: 'JV-2026-003',
    tanggal: '2026-01-12',
    jenis: 'Pembelian',
    keterangan: 'Pembelian bahan baku dan spare part',
    status: 'Posted',
    dibuatOleh: 'Admin',
    lines: [
      { kode: '1-1030', memo: 'Persediaan', debit: 180000000, kredit: 0 },
      { kode: '1-1020', memo: 'Hutang usaha', debit: 0, kredit: 180000000 },
    ],
  },
  {
    id: 4,
    noVoucher: 'JV-2026-004',
    tanggal: '2026-01-18',
    jenis: 'Beban',
    keterangan: 'Pembayaran gaji karyawan periode Januari 2026',
    status: 'Draft',
    dibuatOleh: 'Admin',
    lines: [
      { kode: '5-2000', memo: 'Beban gaji', debit: 65000000, kredit: 0 },
      { kode: '1-1000', memo: 'Pembayaran kas', debit: 0, kredit: 65000000 },
    ],
  },
  {
    id: 5,
    noVoucher: 'JV-2026-005',
    tanggal: '2026-01-25',
    jenis: 'Aset dll',
    keterangan: 'Perolehan mesin produksi baru',
    status: 'Draft',
    dibuatOleh: 'Admin',
    lines: [
      { kode: '1-2010', memo: 'Perolehan mesin', debit: 350000000, kredit: 0 },
      { kode: '1-1010', memo: 'Pembayaran bank', debit: 0, kredit: 350000000 },
    ],
  },
];

/** Jurnal Penyesuaian. */
export const ADJUSTMENT_JOURNALS = [
  {
    id: 'AJ-001',
    tanggal: '2026-01-31',
    tipe: 'Akrual',
    keterangan: 'Beban sewa yang belum dibayar (beban lebih bayar)',
    akun: '5-3000',
    nominal: 4500000,
    status: 'Belum Posting',
  },
  {
    id: 'AJ-002',
    tanggal: '2026-01-31',
    tipe: 'Depresiasi',
    keterangan: 'Susut nilai aset tetap bulan Januari 2026',
    akun: '5-4000',
    nominal: 3250000,
    status: 'Belum Posting',
  },
  {
    id: 'AJ-003',
    tanggal: '2026-01-31',
    tipe: 'Pendapatan Diterima Dimuka',
    keterangan: 'Pendapatan sewa diterima di muka 2 bulan',
    akun: '4-2000',
    nominal: 6000000,
    status: 'Sudah Posting',
  },
];

/** Buku Besar — riwayat mutasi per akun (contoh untuk akun Kas). */
export const LEDGER_MUTATIONS = [
  { tanggal: '2026-01-01', voucher: '-', keterangan: 'Saldo Awal', debit: 50000000, kredit: 0, saldo: 50000000 },
  { tanggal: '2026-01-05', voucher: 'JV-2026-001', keterangan: 'Penerimaan piutang usaha', debit: 75000000, kredit: 0, saldo: 125000000 },
  { tanggal: '2026-01-08', voucher: 'JV-2026-002', keterangan: 'Penjualan ke PT Mitra Teknik', debit: 0, kredit: 425000000, saldo: -300000000 },
  { tanggal: '2026-01-18', voucher: 'JV-2026-004', keterangan: 'Pembayaran gaji karyawan', debit: 0, kredit: 65000000, saldo: -365000000 },
  { tanggal: '2026-01-25', voucher: 'JV-2026-005', keterangan: 'Pembelian mesin produksi', debit: 0, kredit: 0, saldo: -365000000 },
];

/** Neraca Saldo — hasil pembulatan sementara. */
export const TRIAL_BALANCE_ROWS = [
  { kode: '1-1000', nama: 'Kas', debit: 50000000, kredit: 0 },
  { kode: '1-1010', nama: 'Bank BCA', debit: 50000000, kredit: 0 },
  { kode: '1-1020', nama: 'Piutang Usaha', debit: 0, kredit: 25000000 },
  { kode: '1-1030', nama: 'Persediaan / Inventori', debit: 255000000, kredit: 0 },
  { kode: '1-2010', nama: 'Hutang Usaha', debit: 0, kredit: 180000000 },
  { kode: '3-1000', nama: 'Modal Pemilik', debit: 0, kredit: 200000000 },
  { kode: '4-1000', nama: 'Pendapatan Penjualan', debit: 0, kredit: 425000000 },
  { kode: '5-2000', nama: 'Beban Gaji & Tunjangan', debit: 65000000, kredit: 0 },
  { kode: '5-3000', nama: 'Beban Sewa', debit: 4500000, kredit: 0 },
  { kode: '5-4000', nama: 'Beban Utilitas', debit: 3250000, kredit: 0 },
];

/** Laporan Laba Rugi. */
export const INCOME_STATEMENT = {
  pendapatan: [
    { akun: '4-1000', nama: 'Pendapatan Penjualan', nilai: 425000000 },
    { akun: '4-2000', nama: 'Pendapatan Lain-lain', nilai: 0 },
  ],
  hpp: [{ akun: '5-1000', nama: 'Harga Pokok Penjualan', nilai: 180000000 }],
  beban: [
    { akun: '5-2000', nama: 'Beban Gaji & Tunjangan', nilai: 65000000 },
    { akun: '5-3000', nama: 'Beban Sewa', nilai: 4500000 },
    { akun: '5-4000', nama: 'Beban Utilitas', nilai: 3250000 },
  ],
};

/** Laporan Neraca (sederhana, sisi Aset & sisi Pasiva/Ekuitas). */
export const BALANCE_SHEET = {
  aset: [
    { akun: '1-1000', nama: 'Kas', nilai: 50000000 },
    { akun: '1-1010', nama: 'Bank BCA', nilai: 50000000 },
    { akun: '1-1020', nama: 'Piutang Usaha', nilai: 425000000 },
    { akun: '1-1030', nama: 'Persediaan / Inventori', nilai: 75500000 },
  ],
  kewajiban: [{ akun: '1-2010', nama: 'Hutang Usaha', nilai: 180000000 }],
  ekuitas: [
    { akun: '3-1000', nama: 'Modal Pemilik', nilai: 200000000 },
    { akun: '3-2000', nama: 'Laba Ditahan', nilai: 153000000 },
  ],
};

export const rupiah = (n) =>
  'Rp ' + Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 });

export const formatTanggal = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};
