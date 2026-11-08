﻿/**
 * Cetak dokumen modul Akuntansi — template sama dengan Sales Order (SalesOrder.jsx):
 * kop logo + alamat PT. Aldigens Putera Persada, judul dokumen & nomor di kanan,
 * blok meta, tabel bergaris penuh, kotak Keterangan + ringkasan, kotak tanda tangan,
 * dan footer "Dibuat oleh ... | tanggal | Powered by Aldigens ERP".
 *
 * Semua fungsi hanya MEMBACA data yang sudah ada di layar/API.
 * Tidak ada request tulis, tidak mengubah jurnal, tidak menyimpan apa pun.
 */

import {
  printAldigensDocument,
  makeReportNumber,
  getCurrentUserName,
  getPeriodRange,
} from './printAldigensDocument';
import { rupiah, angka } from '../services/accountingApi';

/* ─────────────────────────── Data pengguna & periode ─────────────────────────── */

/** Data user aktif (localStorage `auth_user`) untuk tanda tangan. */
const currentUser = () => {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) || {} : {};
  } catch {
    return {};
  }
};

/** Jabatan user untuk kolom "Dibuat Oleh". */
export const currentUserRole = () => {
  const user = currentUser();
  return user.role || user.jabatan || 'Staff Akuntansi';
};

/** Label periode dari rentang filter tanggal (from–to) halaman. */
export const periodeLabel = (from, to) => {
  if (!from || !to) return '';
  return getPeriodRange('custom', { start: from, end: to }).label;
};

/** Tanda tangan standar voucher/jurnal: Dibuat – Diperiksa – Disetujui. */
export const signVoucher = () => [
  { label: 'Dibuat Oleh', name: getCurrentUserName(), role: currentUserRole() },
  { label: 'Diperiksa Oleh', name: '........................', role: 'Kepala Bagian Akuntansi' },
  { label: 'Disetujui Oleh', name: '........................', role: 'Finance Manager' },
];

/** Tanda tangan laporan: Dibuat – Disetujui. */
export const signLaporan = () => [
  { label: 'Dibuat Oleh', name: getCurrentUserName(), role: currentUserRole() },
  { label: 'Disetujui Oleh', name: '........................', role: 'Finance Manager' },
];

/* ───────────────────────────── Opsi dasar dokumen ───────────────────────────── */

/** Opsi umum: metadata kiri/kanan, keterangan, ringkasan, tanda tangan, footer. */
const baseOptions = ({ title, prefix, metaKiri = [], metaKanan = [], notes = [], summary = [] }) => ({
  title,
  reportNumber: makeReportNumber(prefix),
  metadataLeft: metaKiri,
  metadataRight: [{ label: 'Dicetak Oleh', value: getCurrentUserName() }, ...metaKanan],
  notes,
  summary,
  signatories: signVoucher(),
  landscape: true,
});

/* ───────────────── 1. Chart of Account ─────────────────── */

export const printChartOfAccount = (rows, { filterTipe = 'Semua', filterStatus = 'Semua', search = '' } = {}) => {
  const totalAktif = rows.filter((a) => a.is_active && !a.is_header).length;
  const totalNonaktif = rows.filter((a) => !a.is_active).length;

  return printAldigensDocument(
    baseOptions({
      title: 'DAFTAR CHART OF ACCOUNT',
      prefix: 'COA',
      metaKiri: [
        { key: 'tipe', label: 'Tipe Akun', value: filterTipe, strong: true },
        { key: 'status', label: 'Status', value: filterStatus },
        { key: 'cari', label: 'Pencarian', value: search.trim() ? `"${search.trim()}"` : '-' },
      ],
      metaKanan: [
        { label: 'Total Akun', value: `${rows.length} akun`, strong: true },
        { label: 'Aktif / Nonaktif', value: `${totalAktif} / ${totalNonaktif}` },
      ],
      sections: [
        {
          title: 'DAFTAR AKUN',
          columns: [
            { header: 'No.', width: '5%', align: 'center', value: (r) => r._no },
            { header: 'Nomor Akun', width: '13%', value: (r) => r.nomor_akun },
            { header: 'Nama Akun', width: '34%', value: (r) => r.nama_akun },
            { header: 'Tipe Akun', width: '13%', value: (r) => r.tipe_akun },
            { header: 'Saldo Normal', width: '12%', align: 'center', value: (r) => r.saldo_normal },
            { header: 'Keterangan', width: '15%', value: (r) => r.keterangan },
            { header: 'Status', width: '8%', align: 'center', value: (r) => (r.is_active ? 'Aktif' : 'Nonaktif') },
          ],
          rows: rows.map((r, i) => ({ ...r, _no: i + 1 })),
          footer: { _no: '', nomor_akun: 'TOTAL', nama_akun: `${rows.length} akun`, tipe_akun: '', saldo_normal: '', keterangan: '', is_active: '' },
          emptyMessage: 'Belum ada akun pada filter yang dipilih.',
        },
      ],
      notes: ['Akun bertanda "Induk" tidak dapat dipakai untuk posting jurnal.'],
      summary: [
        { label: 'Total Akun', value: `${rows.length} akun`, total: true },
        { label: 'Akun Aktif', value: `${totalAktif}` },
        { label: 'Akun Nonaktif', value: `${totalNonaktif}` },
      ],
    })
  );
};

/* ───────────────────────────── 2. Rekap Jurnal Umum ────────────────── */

export const printRekapJurnal = (rekap, { from, to }) => {
  const rows = rekap?.rows || [];

  return printAldigensDocument(
    baseOptions({
      title: 'REKAP JURNAL UMUM',
      prefix: 'JMU',
      metaKiri: [
        { label: 'Sumber Data', value: 'Jurnal POSTED', strong: true },
        { label: 'Jumlah Voucher', value: `${rekap?.jumlah_voucher ?? 0} voucher` },
      ],
      metaKanan: [
        { label: 'Status', value: rekap?.balanced ? 'BALANCE' : 'TIDAK BALANCE' },
      ],
      sections: [
        {
          title: 'RINCIAN JURNAL',
          columns: [
            { header: 'Tanggal', width: '8%', align: 'center', value: (r) => r.tanggal },
            { header: 'No. Voucher', width: '10%', value: (r) => r.no_voucher },
            { header: 'Kode Debit', width: '8%', value: (r) => (Number(r.debit) > 0 ? r.nomor_akun : '') },
            { header: 'Nama Akun Debit', width: '17%', value: (r) => (Number(r.debit) > 0 ? r.nama_akun : '') },
            { header: 'Debit', width: '9%', align: 'right', value: (r) => (Number(r.debit) > 0 ? angka(r.debit) : '') },
            { header: 'Kode Kredit', width: '8%', value: (r) => (Number(r.debit) > 0 ? '' : r.nomor_akun) },
            { header: 'Nama Akun Kredit', width: '17%', value: (r) => (Number(r.debit) > 0 ? '' : r.nama_akun) },
            { header: 'Kredit', width: '9%', align: 'right', value: (r) => (Number(r.debit) > 0 ? '' : angka(r.kredit)) },
            { header: 'Keterangan', width: '14%', value: (r) => r.memo || r.keterangan },
          ],
          rows,
          footer: {
            tanggal: '', no_voucher: 'TOTAL', nomor_akun: '', nama_akun: '', debit: angka(rekap?.total_debit),
            kredit: angka(rekap?.total_kredit), memo: `Selisih ${angka(rekap?.selisih)} — ${rekap?.balanced ? 'BALANCE' : 'TIDAK BALANCE'}`,
          },
          emptyMessage: 'Belum ada jurnal posted pada periode ini. Voucher Draft tidak memengaruhi rekap.',
        },
      ],
      notes: [
        `Periode rekap: ${periodeLabel(from, to)}.`,
        'Hanya voucher berstatus POSTED yang masuk rekap. Voucher Draft tidak dihitung.',
      ],
      summary: [
        { label: 'Total Debit', value: rupiah(rekap?.total_debit) },
        { label: 'Total Kredit', value: rupiah(rekap?.total_kredit) },
        { label: 'Selisih', value: rupiah(rekap?.selisih), total: true },
        { label: 'Status', value: rekap?.balanced ? 'BALANCE' : 'TIDAK BALANCE', total: true },
      ],
    }),
    { ...getPeriodRange('custom', { start: from, end: to }) }
  );
};

/* ────────────────────────────── 3. Daftar Voucher ─────────────────── */

export const printDaftarVoucher = (rows, { title = 'DAFTAR VOUCHER', prefix = 'VCR', filterInfo = [] } = {}) => {
  const totalDebit = rows.reduce((s, v) => s + Number(v.total_debit || 0), 0);
  const totalKredit = rows.reduce((s, v) => s + Number(v.total_kredit || 0), 0);

  return printAldigensDocument(
    baseOptions({
      title,
      prefix,
      metaKiri: filterInfo.map((f) => ({ label: f.label, value: f.value, strong: true })),
      metaKanan: [{ label: 'Jumlah Voucher', value: `${rows.length} voucher`, strong: true }],
      sections: [
        {
          title: 'DAFTAR VOUCHER',
          columns: [
            { header: 'No.', width: '4%', align: 'center', value: (v) => v._no },
            { header: 'No. Voucher', width: '12%', value: (v) => v.no_voucher },
            { header: 'Tanggal', width: '9%', align: 'center', value: (v) => v.tanggal },
            { header: 'Jenis', width: '15%', value: (v) => v.jenis },
            { header: 'Keterangan', width: '28%', value: (v) => v.keterangan },
            { header: 'Referensi', width: '10%', value: (v) => v.no_referensi },
            { header: 'Total Debit', width: '11%', align: 'right', value: (v) => angka(v.total_debit) },
            { header: 'Total Kredit', width: '11%', align: 'right', value: (v) => angka(v.total_kredit) },
            { header: 'Status', width: '10%', align: 'center', value: (v) => v.status },
          ],
          rows: rows.map((v, i) => ({ ...v, _no: i + 1 })),
          footer: { _no: '', no_voucher: 'TOTAL', tanggal: '', jenis: '', keterangan: '', no_referensi: '', total_debit: angka(totalDebit), total_kredit: angka(totalKredit), status: '' },
          emptyMessage: 'Belum ada voucher pada filter yang dipilih.',
        },
      ],
      notes: ['Voucher DRAFT belum memengaruhi Buku Besar, Neraca Saldo, dan Laporan Keuangan.'],
      summary: [
        { label: 'Jumlah Voucher', value: `${rows.length} voucher`, total: true },
        { label: 'Total Debit', value: rupiah(totalDebit) },
        { label: 'Total Kredit', value: rupiah(totalKredit) },
      ],
    })
  );
};

/* ─────────────────── 4. Buku Besar ───────────────────── */

export const printBukuBesar = (data) => {
  const mutasi = data?.mutasi || [];
  const account = data?.account || {};

  return printAldigensDocument(
    baseOptions({
      title: 'BUKU BESAR',
      prefix: 'BB',
      metaKiri: [
        { label: 'Nomor Akun', value: account.nomor_akun, strong: true },
        { label: 'Nama Akun', value: account.nama_akun, strong: true },
        { label: 'Tipe Akun', value: account.tipe_akun },
        { label: 'Saldo Normal', value: account.saldo_normal },
      ],
      metaKanan: [
        { label: 'Total Debit', value: rupiah(data?.total_debit) },
        { label: 'Total Kredit', value: rupiah(data?.total_kredit) },
      ],
      sections: [
        {
          title: 'MUTASI AKUN',
          columns: [
            { header: 'No.', width: '4%', align: 'center', value: (m) => m._no },
            { header: 'Tanggal', width: '11%', align: 'center', value: (m) => m.tanggal },
            { header: 'No. Voucher', width: '13%', value: (m) => m.no_voucher },
            { header: 'Keterangan', width: '38%', value: (m) => m.keterangan },
            { header: 'Debit', width: '11%', align: 'right', value: (m) => (m.debit ? angka(m.debit) : '') },
            { header: 'Kredit', width: '11%', align: 'right', value: (m) => (m.kredit ? angka(m.kredit) : '') },
            { header: 'Saldo', width: '12%', align: 'right', value: (m) => `${m.saldo < 0 ? '(-)' : ''}${angka(Math.abs(m.saldo))}` },
          ],
          rows: mutasi.map((m, i) => ({ ...m, _no: i + 1 })),
          footer: { _no: '', tanggal: '', no_voucher: 'TOTAL', keterangan: '', debit: angka(data?.total_debit), kredit: angka(data?.total_kredit), saldo: angka(Math.abs(data?.saldo_akhir ?? 0)) },
          emptyMessage: 'Belum ada mutasi pada periode ini.',
        },
      ],
      notes: ['Saldo dihitung dari saldo awal Chart of Account ditambah mutasi jurnal POSTED.'],
      summary: [
        { label: 'Saldo Awal', value: rupiah(Math.abs(data?.saldo_awal ?? 0)) },
        { label: 'Total Debit', value: rupiah(data?.total_debit) },
        { label: 'Total Kredit', value: rupiah(data?.total_kredit) },
        { label: 'Saldo Akhir', value: rupiah(Math.abs(data?.saldo_akhir ?? 0)), total: true },
        { label: 'Posisi', value: (data?.saldo_akhir ?? 0) >= 0 ? 'DEBIT' : 'KREDIT', total: true },
      ],
    })
  );
};

/* ────────────────── 5. Neraca Saldo ─────────────────── */

export const printNeracaSaldo = (data, { from, to, tipe = 'Semua' }) => {
  const rows = data?.rows || [];
  const saldoAwal = rows.reduce((s, r) => s + Number(r.saldo_awal || 0), 0);

  return printAldigensDocument(
    baseOptions({
      title: 'NERACA SALDO',
      prefix: 'NSD',
      metaKiri: [
        { label: 'Tipe Akun', value: tipe, strong: true },
        { label: 'Sumber Data', value: 'Jurnal POSTED' },
      ],
      metaKanan: [
        { label: 'Status Jurnal', value: data?.balanced ? 'BALANCE' : 'TIDAK BALANCE' },
      ],
      sections: [
        {
          title: 'SALDO PER AKUN',
          columns: [
            { header: 'No.', width: '4%', align: 'center', value: (r) => r._no },
            { header: 'Nomor Akun', width: '12%', value: (r) => r.nomor_akun },
            { header: 'Nama Akun', width: '40%', value: (r) => r.nama_akun },
            { header: 'Tipe Akun', width: '13%', value: (r) => r.tipe_akun },
            { header: 'Debit', width: '15.5%', align: 'right', value: (r) => (r.debit ? angka(r.debit) : '') },
            { header: 'Kredit', width: '15.5%', align: 'right', value: (r) => (r.kredit ? angka(r.kredit) : '') },
          ],
          rows: rows.map((r, i) => ({ ...r, _no: i + 1 })),
          footer: { _no: '', nomor_akun: 'TOTAL SALDO', nama_akun: '', tipe_akun: '', debit: angka(data?.total_debit), kredit: angka(data?.total_kredit) },
          emptyMessage: 'Belum ada akun. Tambahkan Chart of Account terlebih dahulu.',
        },
      ],
      notes: ['Neraca saldo dihitung otomatis dari jurnal yang sudah diposting dan tidak dapat diedit manual.'],
      summary: [
        { label: 'Total Saldo Awal', value: rupiah(saldoAwal) },
        { label: 'Mutasi Debit', value: rupiah(data?.mutasi_debit) },
        { label: 'Mutasi Kredit', value: rupiah(data?.mutasi_kredit) },
        { label: 'Total Debit', value: rupiah(data?.total_debit), total: true },
        { label: 'Total Kredit', value: rupiah(data?.total_kredit), total: true },
        { label: 'Selisih Mutasi', value: rupiah(data?.selisih) },
      ],
    }),
    { from, to }
  );
};

/* ───────────────────────── 6 & 7. Financial Reports (terpisah) ─────────────── */

/** Bagian tabel per kelompok akun (Pendapatan / HPP / Beban / Aset / dst). */
const blok = (label, items, total, totalLabel) => ({
  title: label,
  columns: [
    { header: 'Nomor Akun', width: '12%', value: (r) => r.nomor_akun },
    { header: 'Nama Akun', width: '63%', value: (r) => r.nama_akun },
    { header: 'Jumlah', width: '25%', align: 'right', value: (r) => angka(r.saldo) },
  ],
  rows: items || [],
  footer: { nomor_akun: '', nama_akun: totalLabel, saldo: angka(total) },
  emptyMessage: 'Tidak ada akun.',
});

/**
 * Laporan Laba Rugi (dokumen tersendiri).
 * @returns {boolean} false bila popup diblokir.
 */
export const printLabaRugi = (labaRugi, { from, to }) =>
  printAldigensDocument({
    ...baseOptions({
      title: 'LAPORAN LABA RUGI',
      prefix: 'LR',
      metaKiri: [
        { label: 'Periode', value: periodeLabel(from, to), strong: true },
        { label: 'Sumber Data', value: 'Jurnal POSTED' },
      ],
      metaKanan: [{ label: 'Laba Kotor', value: rupiah(labaRugi?.laba_kotor) }],
      sections: [
        blok('PENDAPATAN', labaRugi?.pendapatan, labaRugi?.total_pendapatan, 'Total Pendapatan'),
        blok('HARGA POK PENJUALAN', labaRugi?.harga_pok, labaRugi?.total_hpp, 'Total HPP'),
        blok('BEBAN', labaRugi?.beban, labaRugi?.total_beban, 'Total Beban'),
      ],
      notes: [
        'Laporan dihitung dari Chart of Account, saldo awal, dan jurnal yang sudah diposting.',
        'Nilai negatif berarti saldo berlawanan dengan saldo normal akun.',
      ],
      summary: [
        { label: 'Total Pendapatan', value: rupiah(labaRugi?.total_pendapatan) },
        { label: 'Total HPP', value: rupiah(labaRugi?.total_hpp) },
        { label: 'Laba Kotor', value: rupiah(labaRugi?.laba_kotor), total: true },
        { label: 'Total Beban', value: rupiah(labaRugi?.total_beban) },
        { label: 'LABA / RUGI BERSIH', value: rupiah(labaRugi?.laba_bersih), total: true },
      ],
      signatories: signLaporan(),
    }),
    periodLabel: periodeLabel(from, to),
  });

/**
 * Neraca / Laporan Posisi Keuangan (dokumen tersendiri).
 * @returns {boolean} false bila popup diblokir.
 */
export const printNeraca = (neraca, { from, to }) =>
  printAldigensDocument({
    ...baseOptions({
      title: 'NERACA (LAPORAN POSISI KEUANGAN)',
      prefix: 'NRC',
      metaKiri: [
        { label: 'Periode', value: periodeLabel(from, to), strong: true },
        { label: 'Sumber Data', value: 'Jurnal POSTED' },
      ],
      metaKanan: [
        { label: 'Status', value: neraca?.balanced ? 'NERACA SEIMBANG' : 'NERACA TIDAK SEIMBANG' },
      ],
      sections: [
        blok('ASET', neraca?.aset, neraca?.total_aset, 'Total Aset'),
        blok('KEWAJIBAN', neraca?.kewajiban, neraca?.total_kewajiban, 'Total Kewajiban'),
        blok('EKUITAS', neraca?.ekuitas, neraca?.total_ekuitas, 'Total Ekuitas'),
      ],
      notes: [
        'Neraca disusun dari Chart of Account, saldo awal, dan jurnal yang sudah diposting.',
        `Total Pasiva (Kewajiban + Ekuitas) = ${rupiah(Number(neraca?.total_kewajiban || 0) + Number(neraca?.total_ekuitas || 0))}.`,
      ],
      summary: [
        { label: 'Total Aset', value: rupiah(neraca?.total_aset), total: true },
        { label: 'Total Kewajiban', value: rupiah(neraca?.total_kewajiban) },
        { label: 'Total Ekuitas', value: rupiah(neraca?.total_ekuitas) },
        { label: 'Total Pasiva', value: rupiah(Number(neraca?.total_kewajiban || 0) + Number(neraca?.total_ekuitas || 0)), total: true },
        { label: neraca?.balanced ? 'NERACA SEIMBANG' : 'NERACA TIDAK SEIMBANG', value: `Selisih ${rupiah(Math.abs(neraca?.selisih || 0))}`, total: true },
      ],
      signatories: signLaporan(),
    }),
    periodLabel: periodeLabel(from, to),
  });


/* ──────────────────────────────── 8. Detail Voucher ───────────────── */

export const printVoucherDetail = (voucher) => {
  const lines = voucher?.lines || [];
  const totalDebit = lines.reduce((s, l) => s + Number(l.debit || 0), 0);
  const totalKredit = lines.reduce((s, l) => s + Number(l.kredit || 0), 0);
  const balanced = Math.abs(totalDebit - totalKredit) < 0.009;

  return printAldigensDocument({
    title: String(voucher?.jenis || 'JOURNAL VOUCHER').toUpperCase(),
    reportNumber: voucher?.no_voucher || '-',
    metadataLeft: [
      { label: 'Tanggal', value: voucher?.tanggal, strong: true },
      { label: 'Jenis Voucher', value: voucher?.jenis },
      { label: 'Status', value: voucher?.status, strong: true },
    ],
    metadataRight: [
      { label: 'Pihak Terkait', value: voucher?.pihak_terkait },
      { label: 'Kas / Bank', value: voucher?.kas_bank },
      { label: 'Referensi', value: voucher?.no_referensi },
      { label: 'Dicetak Oleh', value: getCurrentUserName() },
    ],
    infoBox: [{ label: 'Keterangan', value: voucher?.keterangan || '-', full: true }],
    sections: [
      {
        title: 'RINCIAN JURNAL',
        columns: [
          { header: 'No.', width: '5%', align: 'center', value: (l) => l._no },
          { header: 'Nomor Akun', width: '14%', value: (l) => l.nomor_akun },
          { header: 'Nama Akun', width: '31%', value: (l) => l.nama_akun },
          { header: 'Memo', width: '22%', value: (l) => l.memo },
          { header: 'Debit', width: '14%', align: 'right', value: (l) => (Number(l.debit) ? angka(l.debit) : '') },
          { header: 'Kredit', width: '14%', align: 'right', value: (l) => (Number(l.kredit) ? angka(l.kredit) : '') },
        ],
        rows: lines.map((l, i) => ({ ...l, _no: i + 1 })),
        footer: { _no: '', nomor_akun: 'TOTAL', nama_akun: '', memo: '', debit: angka(totalDebit), kredit: angka(totalKredit) },
        emptyMessage: 'Belum ada baris jurnal pada voucher ini.',
      },
    ],
    notes: [
      balanced
        ? `Jurnal seimbang: Total Debit = Total Kredit (${rupiah(totalDebit)}).`
        : `Jurnal BELUM seimbang. Selisih ${rupiah(Math.abs(totalDebit - totalKredit))}.`,
    ],
    summary: [
      { label: 'Total Debit', value: rupiah(totalDebit) },
      { label: 'Total Kredit', value: rupiah(totalKredit) },
      { label: balanced ? 'BALANCE' : 'TIDAK BALANCE', value: rupiah(Math.abs(totalDebit - totalKredit)), total: true },
    ],
    signatories: signVoucher(),
  });
};

/* ───────────────────────────── 9. Kas & Bank ───────────────────────────── */

const tglSingkat = (value) => {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : (value || '-');
};

/** Laporan saldo Kas & Bank (total saldo awal vs saldo akhir per rekening). */
export const printKasBankRingkasan = (data, { from, to }) =>
  printAldigensDocument({
    ...baseOptions({
      title: 'LAPORAN SALDO KAS & BANK',
      prefix: 'KB',
      metaKiri: [
        { label: 'Periode Saldo Akhir', value: periodeLabel(from, to), strong: true },
        { label: 'Sumber Saldo', value: 'Saldo awal COA + jurnal POSTED' },
      ],
      metaKanan: [
        { label: 'Total Penerimaan', value: rupiah(data?.total_penerimaan) },
        { label: 'Total Pengeluaran', value: rupiah(data?.total_pengeluaran) },
      ],
      sections: [{
        title: 'SALDO PER KAS / REKENING',
        columns: [
          { header: 'No.', width: '4%', align: 'center', value: (r) => r._no },
          { header: 'Nama Kas / Bank', width: '22%', value: (r) => r.nama_tampilan },
          { header: 'Jenis', width: '8%', align: 'center', value: (r) => r.jenis },
          { header: 'Kode Akun', width: '10%', value: (r) => r.kode_akun },
          { header: 'Nama Akun COA', width: '20%', value: (r) => r.nama_akun },
          { header: 'Saldo Awal', width: '12%', align: 'right', value: (r) => angka(r.saldo_awal) },
          { header: 'Debit (Masuk)', width: '12%', align: 'right', value: (r) => angka(r.mutasi_debit) },
          { header: 'Kredit (Keluar)', width: '12%', align: 'right', value: (r) => angka(r.mutasi_kredit) },
        ],
        rows: (data?.rekening || []).map((r, i) => ({ ...r, _no: i + 1 })),
        footer: {
          _no: '', nama_tampilan: 'TOTAL', jenis: '', kode_akun: '', nama_akun: '',
          saldo_awal: angka(data?.total_saldo_awal),
          mutasi_debit: angka((data?.rekening || []).reduce((s, r) => s + Number(r.mutasi_debit || 0), 0)),
          mutasi_kredit: angka((data?.rekening || []).reduce((s, r) => s + Number(r.mutasi_kredit || 0), 0)),
        },
        emptyMessage: 'Belum ada master Kas/Bank.',
      }],
      notes: [
        'Saldo akhir dihitung dari saldo awal akun COA ditambah seluruh mutasi jurnal POSTED (Draft/Void tidak dihitung).',
        'Saldo awal pada laporan ini hanya untuk akun Kas/Bank yang terdaftar. Pembukaan akun lain tetap diisi di Chart of Account.',
        ...(data?.peringatan || []),
      ],
      summary: [
        { label: 'Jumlah Kas', value: `${data?.jumlah_kas ?? 0}` },
        { label: 'Jumlah Bank', value: `${data?.jumlah_bank ?? 0}` },
        { label: 'Total Saldo Awal', value: rupiah(data?.total_saldo_awal) },
        { label: 'Total Penerimaan', value: rupiah(data?.total_penerimaan) },
        { label: 'Total Pengeluaran', value: rupiah(data?.total_pengeluaran) },
        { label: 'TOTAL SALDO AKHIR', value: rupiah(data?.total_saldo_akhir), total: true },
      ],
      signatories: signLaporan(),
    }),
    periodLabel: periodeLabel(from, to),
  });

/** Laporan mutasi satu kas/bank beserta saldo berjalan. */
export const printKasBankMutasi = (data, { from, to, jenis = 'Semua', search = '' }) =>
  printAldigensDocument({
    ...baseOptions({
      title: 'MUTASI KAS & BANK',
      prefix: 'MKB',
      metaKiri: [
        { label: 'Kas / Bank', value: data?.cash_bank?.nama_tampilan, strong: true },
        { label: 'Kode / Nama Akun', value: `${data?.cash_bank?.kode_akun || '-'} — ${data?.cash_bank?.nama_akun || '-'}` },
        { label: 'Jenis Transaksi', value: jenis || 'Semua' },
        { label: 'Pencarian', value: search ? `"${search}"` : '-' },
      ],
      metaKanan: [
        { label: 'Rekening', value: data?.cash_bank?.rekening_masked },
        { label: 'Total Debit', value: rupiah(data?.total_debit) },
        { label: 'Total Kredit', value: rupiah(data?.total_kredit) },
      ],
      sections: [{
        title: 'DETAIL MUTASI',
        columns: [
          { header: 'No.', width: '4%', align: 'center', value: (r) => r._no },
          { header: 'Tanggal', width: '9%', align: 'center', value: (r) => tglSingkat(r.tanggal) },
          { header: 'No. Voucher', width: '12%', value: (r) => r.no_voucher },
          { header: 'Jenis', width: '15%', value: (r) => r.jenis },
          { header: 'Keterangan', width: '22%', value: (r) => r.keterangan },
          { header: 'Referensi', width: '9%', value: (r) => r.no_referensi },
          { header: 'Debit', width: '10%', align: 'right', value: (r) => (r.debit ? angka(r.debit) : '') },
          { header: 'Kredit', width: '10%', align: 'right', value: (r) => (r.kredit ? angka(r.kredit) : '') },
          { header: 'Saldo', width: '9%', align: 'right', value: (r) => angka(r.saldo_running) },
        ],
        rows: (data?.rows || []).map((r, i) => ({ ...r, _no: i + 1 })),
        footer: {
          _no: '', tanggal: '', no_voucher: 'TOTAL', jenis: '', keterangan: '', no_referensi: '',
          debit: angka(data?.total_debit), kredit: angka(data?.total_kredit), saldo_running: angka(data?.saldo_akhir),
        },
        emptyMessage: 'Tidak ada mutasi pada periode/filter ini.',
      }],
      notes: [
        `Saldo awal periode: ${rupiah(data?.saldo_awal_periode)} (saldo awal COA + mutasi sebelum ${tglSingkat(from)}).`,
        'Hanya voucher POSTED yang dihitung. Voucher Draft/Void tidak memengaruhi saldo.',
      ],
      summary: [
        { label: 'Saldo Awal Periode', value: rupiah(data?.saldo_awal_periode) },
        { label: 'Total Debit', value: rupiah(data?.total_debit) },
        { label: 'Total Kredit', value: rupiah(data?.total_kredit) },
        { label: 'SALDO AKHIR', value: rupiah(data?.saldo_akhir), total: true },
      ],
      signatories: signLaporan(),
    }),
    periodLabel: periodeLabel(from, to),
  });

/* ────────────────────────── 10. Piutang & Utang ────────────────────────── */

const statusLabel = {
  UNPAID: 'Belum Dibayar',
  PARTIALLY_PAID: 'Dibayar Sebagian',
  PAID: 'Lunas',
  OVERDUE: 'Terlambat',
};

const kolomTagihan = (isPiutang) => [
  { header: 'No.', width: '4%', align: 'center', value: (r) => r._no },
  { header: isPiutang ? 'No. Invoice' : 'No. Tagihan', width: '14%', value: (r) => r.invoice_number },
  { header: isPiutang ? 'Customer' : 'Supplier', width: '22%', value: (r) => (isPiutang ? r.customer_name : r.supplier_name) },
  { header: 'Tgl / Jatuh Tempo', width: '13%', value: (r) => `${tglSingkat(r.invoice_date)} / ${tglSingkat(r.due_date)}` },
  { header: 'Total', width: '13%', align: 'right', value: (r) => angka(r.total) },
  { header: 'Dibayar', width: '12%', align: 'right', value: (r) => angka(r.dibayar) },
  { header: 'Sisa', width: '12%', align: 'right', value: (r) => angka(r.sisa) },
  { header: 'Status', width: '10%', align: 'center', value: (r) => statusLabel[r.status] || r.status },
];

const cetakTagihan = (data, { from, to, status }, isPiutang) =>
  printAldigensDocument({
    ...baseOptions({
      title: isPiutang ? 'DAFTAR PIUTANG CUSTOMER' : 'DAFTAR UTANG SUPPLIER',
      prefix: isPiutang ? 'AR' : 'AP',
      metaKiri: [
        { label: 'Status', value: status && status !== 'Semua' ? (statusLabel[status] || status) : 'Semua status', strong: true },
        { label: 'Sumber Data', value: isPiutang ? 'Invoice penjualan + alokasi pembayaran' : 'Purchase invoice + alokasi pembayaran' },
      ],
      metaKanan: [
        { label: 'Jumlah Dokumen', value: `${(data?.rows || []).length}` },
        { label: 'Total Sisa', value: rupiah(data?.ringkasan?.total_berjalan) },
      ],
      sections: [{
        title: isPiutang ? 'RINCIAN PIUTANG' : 'RINCIAN UTANG',
        columns: kolomTagihan(isPiutang),
        rows: (data?.rows || []).map((r, i) => ({ ...r, _no: i + 1 })),
        footer: {
          _no: '', invoice_number: 'TOTAL', customer_name: '', supplier_name: '', invoice_date: '', due_date: '',
          total: angka((data?.rows || []).reduce((s, r) => s + Number(r.total || 0), 0)),
          dibayar: angka((data?.rows || []).reduce((s, r) => s + Number(r.dibayar || 0), 0)),
          sisa: angka(data?.ringkasan?.total_berjalan),
          status: '',
        },
        emptyMessage: 'Tidak ada data pada filter yang dipilih.',
      }],
      notes: [
        'Status Terlambat dihitung otomatis dari tanggal jatuh tempo dan sisa tagihan.',
        'Nilai pembayaran diambil dari alokasi pembayaran yang sudah POSTED, bukan dari status teks invoice.',
        data?.catatan || '',
      ].filter(Boolean),
      summary: [
        { label: 'Belum Jatuh Tempo', value: rupiah(data?.ringkasan?.belum_jatuh_tempo) },
        { label: 'Terlambat', value: rupiah(data?.ringkasan?.terlambat) },
        { label: 'Lunas', value: `${data?.ringkasan?.jumlah_lunas ?? 0} dokumen` },
        { label: 'TOTAL SISA', value: rupiah(data?.ringkasan?.total_berjalan), total: true },
      ],
      signatories: signLaporan(),
    }),
    periodLabel: periodeLabel(from, to),
  });

export const printPiutang = (data, opsi) => cetakTagihan(data, opsi, true);
export const printUtang = (data, opsi) => cetakTagihan(data, opsi, false);

export const printUmurTagihan = (data, { from, to, jenis }) => {
  const isPiutang = jenis === 'piutang';
  const bucket = data?.[jenis] || {};
  const detail = (isPiutang ? data?.detail_piutang : data?.detail_utang) || [];

  const barisBucket = [
    ['Belum jatuh tempo', bucket.belum_jatuh_tempo],
    ['1 - 30 hari', bucket['1_30']],
    ['31 - 60 hari', bucket['31_60']],
    ['61 - 90 hari', bucket['61_90']],
    ['Lebih dari 90 hari', bucket.lebih_90],
  ];

  return printAldigensDocument({
    ...baseOptions({
      title: isPiutang ? 'UMUR PIUTANG CUSTOMER' : 'UMUR UTANG SUPPLIER',
      prefix: isPiutang ? 'ARG' : 'APG',
      metaKiri: [
        { label: 'Jenis', value: isPiutang ? 'Piutang Customer' : 'Utang Supplier', strong: true },
        { label: 'Dasar Perhitungan', value: 'Tanggal jatuh tempo vs tanggal cetak' },
      ],
      metaKanan: [{ label: 'Jumlah Tagihan Terbuka', value: `${detail.length}` }],
      sections: [
        {
          title: 'REKAP UMUR TAGIHAN',
          columns: [
            { header: 'Kelompok Umur', width: '60%', value: (r) => r.label },
            { header: 'Nilai', width: '40%', align: 'right', value: (r) => angka(r.nilai) },
          ],
          rows: barisBucket.map(([label, nilai]) => ({ label, nilai })),
          footer: {
            label: 'TOTAL',
            nilai: angka(barisBucket.reduce((s, [, v]) => s + Number(v || 0), 0)),
          },
        },
        {
          title: 'RINCIAN TAGIHAN BELUM LUNAS',
          columns: [
            { header: 'No.', width: '4%', align: 'center', value: (r) => r._no },
            { header: 'Dokumen', width: '18%', value: (r) => r.invoice_number },
            { header: isPiutang ? 'Customer' : 'Supplier', width: '28%', value: (r) => (isPiutang ? r.customer_name : r.supplier_name) },
            { header: 'Jatuh Tempo', width: '14%', align: 'center', value: (r) => tglSingkat(r.due_date) },
            { header: 'Umur (hari)', width: '12%', align: 'right', value: (r) => (r.umur_hari ?? '-') },
            { header: 'Sisa', width: '14%', align: 'right', value: (r) => angka(r.sisa) },
            { header: 'Status', width: '10%', align: 'center', value: (r) => statusLabel[r.status] || r.status },
          ],
          rows: detail.map((r, i) => ({ ...r, _no: i + 1 })),
          footer: {
            _no: '', invoice_number: 'TOTAL', customer_name: '', supplier_name: '', due_date: '', umur_hari: '',
            sisa: angka(detail.reduce((s, r) => s + Number(r.sisa || 0), 0)), status: '',
          },
          emptyMessage: 'Tidak ada tagihan belum lunas.',
        },
      ],
      notes: ['Umur hari dihitung positif bila sudah melewati tanggal jatuh tempo.'],
      summary: [
        ...barisBucket.map(([label, nilai]) => ({ label, value: rupiah(nilai) })),
        { label: 'TOTAL', value: rupiah(barisBucket.reduce((s, [, v]) => s + Number(v || 0), 0)), total: true },
      ],
      signatories: signLaporan(),
      landscape: true,
    }),
    periodLabel: periodeLabel(from, to),
  });
};
