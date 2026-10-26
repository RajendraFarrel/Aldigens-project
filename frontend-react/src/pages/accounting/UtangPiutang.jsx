// Modul Utang Piutang — piutang customer & utang supplier.
// Sumber data: invoice asli (invoices / purchase_invoices) + alokasi pembayaran.
// Semua angka dari backend; tidak ada transaksi keuangan di localStorage.
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  HandCoins, RefreshCw, Search, Printer, AlertTriangle, Info,
  ArrowDownLeft, ArrowUpRight, Save, Plus, Trash2,
} from 'lucide-react';
import {
  getRpRingkasan, getPiutang, getUtang, getRpAging, getRpCustomers, getRpSuppliers,
  getPenerimaanCustomer, createPenerimaanCustomer,
  getPembayaranSupplier, createPembayaranSupplier,
  getCashBanks, periodeDefault, todayISODate,
  rupiah, angka, formatTanggal, PAYMENT_STATUS, PAYMENT_STATUS_LABEL,
} from '../../services/accountingApi';
import { printPiutang, printUtang, printUmurTagihan } from '../../utils/accountingPrint';
import { swalError, swalSuccess } from '../../utils/swal';

const TABS = [
  { key: 'ringkasan', label: 'Ringkasan' },
  { key: 'piutang', label: 'Piutang Customer' },
  { key: 'utang', label: 'Utang Supplier' },
  { key: 'penerimaan', label: 'Penerimaan Customer' },
  { key: 'pembayaran', label: 'Pembayaran Supplier' },
  { key: 'aging', label: 'Umur Tagihan' },
  { key: 'riwayat', label: 'Laporan dan Riwayat' },
];

const inputClass =
  'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500';
const labelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1';
const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm';
const btnPrimary =
  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';
const btnNeutral =
  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-700 text-white hover:bg-slate-800 transition shadow-sm cursor-pointer disabled:opacity-60';
const btnGhost =
  'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer';

const statusBadge = (status) => {
  const map = {
    PAID: 'bg-emerald-100 text-emerald-700',
    PARTIALLY_PAID: 'bg-blue-100 text-blue-700',
    UNPAID: 'bg-slate-100 text-slate-600',
    OVERDUE: 'bg-rose-100 text-rose-700',
  };
  return `text-[11px] font-bold px-2 py-1 rounded-full ${map[status] || 'bg-slate-100 text-slate-600'}`;
};

const goTo = (tab) => window.dispatchEvent(new CustomEvent('aldigens:goto', { detail: tab }));

/**
 * Pesan kegagalan request yang tidak menyesatkan pengguna.
 * 422/500 dari backend membawa `message`; gangguan jaringan tidak.
 */
const pesanGagal = (err, fallback) => {
  if (!err?.response) return 'Tidak dapat menghubungi server. Periksa koneksi/backend lalu muat ulang.';
  const detail = err.response.data?.message || err.response.data?.error;
  return detail ? `${fallback}: ${detail}` : `${fallback} (HTTP ${err.response.status}).`;
};

/**
 * Baca daftar customer/supplier dari respons API existing.
 * Kontrak /receivables-payables/master: array datar di `customers` / `suppliers`.
 * Bila suatu saat dibungkus `data` (mis. paginator), tetap dibaca dengan benar.
 * ID dan nama dipetakan ke bentuk yang dipakai select halaman ini.
 */
const bacaMaster = (payload, kunci, prefix) => {
  let rows = payload?.[kunci];
  if (rows && !Array.isArray(rows) && Array.isArray(rows.data)) rows = rows.data;
  if (!Array.isArray(rows)) return [];

  return rows
    .filter((r) => r && r.id != null)
    .map((r) => ({
      ...r,
      id: r.id,
      kode: r[`${prefix}_code`] ?? '',
      nama: r[`${prefix}_name`] ?? `#${r.id}`,
      status: r.status ?? '',
      // Nama field flat dipertahankan supaya pemakaian lama tetap jalan.
      [`${prefix}_name`]: r[`${prefix}_name`] ?? `#${r.id}`,
    }));
};

/** Daftar yang gagal dimuat ditampilkan di tempat, bukan sebagai modal penutup halaman. */
function PeringatanMaster({ pesan, loading, onRetry }) {
  if (loading || !pesan) return null;
  return (
    <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">{pesan}</p>
        </div>
        <button onClick={onRetry} className={btnGhost}>
          <RefreshCw className="h-4 w-4" /> Muat Ulang
        </button>
      </div>
      <p className="text-xs text-red-600 dark:text-red-400 mt-1 ml-6">
        Bagian lain halaman tetap dapat dipakai. Data tidak diisi dari cache/localStorage.
      </p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */

export default function UtangPiutang() {
  const [tab, setTab] = useState('ringkasan');
  const [periode, setPeriode] = useState(periodeDefault());
  const [master, setMaster] = useState({ customers: [], suppliers: [] });
  const [masterStatus, setMasterStatus] = useState({
    loading: true, customersError: '', suppliersError: '',
  });
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  /*
   * Muat master customer & supplier sekali saat halaman dibuka (dan saat Muat Ulang).
   * Kedua request berjalan paralel dan dinilai sendiri-sendiri: respons kosong yang
   * valid bukan error (empty state), sedangkan kegagalan HTTP ditampilkan per bagian.
   * Tidak ada fallback localStorage / data dummy.
   */
  const muatMaster = useCallback(async () => {
    setMasterStatus((s) => ({ ...s, loading: true, customersError: '', suppliersError: '' }));

    const [cust, supp] = await Promise.allSettled([getRpCustomers(), getRpSuppliers()]);

    const hasil = { customers: [], suppliers: [] };
    const status = { loading: false, customersError: '', suppliersError: '' };

    if (cust.status === 'fulfilled') {
      hasil.customers = bacaMaster(cust.value.data, 'customers', 'customer');
    } else {
      status.customersError = pesanGagal(cust.reason, 'Gagal memuat master customer');
      if (import.meta.env.DEV) console.error('[UtangPiutang] master customer gagal:', cust.reason);
    }

    if (supp.status === 'fulfilled') {
      hasil.suppliers = bacaMaster(supp.value.data, 'suppliers', 'supplier');
    } else {
      status.suppliersError = pesanGagal(supp.reason, 'Gagal memuat master supplier');
      if (import.meta.env.DEV) console.error('[UtangPiutang] master supplier gagal:', supp.reason);
    }

    setMaster(hasil);
    setMasterStatus(status);
  }, []);

  useEffect(() => { muatMaster(); }, [muatMaster, reloadKey]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow">
            <HandCoins className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Utang Piutang</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Piutang customer &amp; utang supplier dari invoice asli, terintegrasi Kas &amp; Bank dan jurnal
            </p>
          </div>
        </div>
        <button onClick={refresh} className={btnGhost}>
          <RefreshCw className="h-4 w-4" /> Muat Ulang
        </button>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-sm font-semibold border-b-2 -mb-px transition cursor-pointer
              ${tab === t.key
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <PeringatanMaster
        pesan={masterStatus.customersError}
        loading={masterStatus.loading}
        onRetry={muatMaster}
      />
      <PeringatanMaster
        pesan={masterStatus.suppliersError}
        loading={masterStatus.loading}
        onRetry={muatMaster}
      />

      {tab === 'ringkasan' && <TabRingkasan key={`r${reloadKey}`} periode={periode} setPeriode={setPeriode} />}
      {tab === 'piutang' && (
        <TabPiutang
          key={`p${reloadKey}`}
          periode={periode} setPeriode={setPeriode}
          customers={master.customers}
          masterLoading={masterStatus.loading}
          masterError={masterStatus.customersError}
        />
      )}
      {tab === 'utang' && (
        <TabUtang
          key={`u${reloadKey}`}
          periode={periode} setPeriode={setPeriode}
          suppliers={master.suppliers}
          masterLoading={masterStatus.loading}
          masterError={masterStatus.suppliersError}
        />
      )}
      {tab === 'penerimaan' && (
        <TabPenerimaan
          key={`rc${reloadKey}`}
          customers={master.customers}
          masterLoading={masterStatus.loading}
          masterError={masterStatus.customersError}
          onSaved={refresh}
        />
      )}
      {tab === 'pembayaran' && (
        <TabPembayaran
          key={`py${reloadKey}`}
          suppliers={master.suppliers}
          masterLoading={masterStatus.loading}
          masterError={masterStatus.suppliersError}
          onSaved={refresh}
        />
      )}
      {tab === 'aging' && <TabAging key={`a${reloadKey}`} periode={periode} setPeriode={setPeriode} />}
      {tab === 'riwayat' && <TabRiwayat key={`h${reloadKey}`} periode={periode} setPeriode={setPeriode} />}
    </div>
  );
}

/* ══════════════════════════ Helper UI kecil ══════════════════════════ */

function Kartu({ label, nilai, tone, bold }) {
  const color = tone === 'emerald'
    ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'rose' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white';
  return (
    <div className={`${card} p-3`}>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`${bold ? 'text-xl' : 'text-lg'} font-bold ${color}`}>{nilai}</p>
    </div>
  );
}

function FilterPeriode({ periode, setPeriode, children }) {
  return (
    <div className={`${card} p-4 flex flex-wrap items-end gap-3`}>
      <div>
        <label className={labelClass}>Dari</label>
        <input type="date" value={periode.from}
          onChange={(e) => setPeriode({ ...periode, from: e.target.value })} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Sampai</label>
        <input type="date" value={periode.to}
          onChange={(e) => setPeriode({ ...periode, to: e.target.value })} className={inputClass} />
      </div>
      {children}
    </div>
  );
}

function KonfigurasiAlert({ konfigurasi, label }) {
  if (!konfigurasi) return null;
  if (konfigurasi.akun) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-600 dark:text-slate-300">
        Akun {label}: <strong>{konfigurasi.akun}</strong>
      </div>
    );
  }
  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3">
      <p className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" /> Akun {label} belum dapat ditentukan
      </p>
      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{konfigurasi.pesan}</p>
      {konfigurasi.kandidat?.length > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
          Kandidat: {konfigurasi.kandidat.join(' · ')}
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════ TAB RINGKASAN ══════════════════════════ */

function TabRingkasan({ periode, setPeriode }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const muat = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await getRpRingkasan({ from: periode.from, to: periode.to });
      setData(res);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[UtangPiutang] ringkasan gagal:', err);
      setData(null);
      setError(pesanGagal(err, 'Gagal memuat ringkasan utang piutang'));
    } finally {
      setLoading(false);
    }
  }, [periode]);

  useEffect(() => { muat(); }, [muat]);

  const pi = data?.piutang;
  const ut = data?.utang;

  return (
    <div className="space-y-4">
      <FilterPeriode periode={periode} setPeriode={setPeriode}>
        <button onClick={muat} className={btnGhost}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Muat
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Posisi saldo dihitung dari invoice &amp; pembayaran POSTED, bukan dari status teks.
        </p>
      </FilterPeriode>

      <PeringatanMaster pesan={error} loading={loading} onRetry={muat} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kartu label="Total Piutang" nilai={rupiah(pi?.ringkasan?.total_berjalan)} tone="emerald" bold />
        <Kartu label="Piutang Terlambat" nilai={rupiah(pi?.ringkasan?.terlambat)} tone="rose" />
        <Kartu label="Total Utang" nilai={rupiah(ut?.ringkasan?.total_berjalan)} tone="rose" bold />
        <Kartu label="Posisi Neto (Piutang - Utang)" nilai={rupiah(data?.posisi_neto)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${card} p-4 space-y-2`}>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Piutang Customer</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Baris label="Invoice terbuka" value={`${pi?.ringkasan?.jumlah_invoice ?? 0}`} />
            <Baris label="Lunas" value={`${pi?.ringkasan?.jumlah_lunas ?? 0}`} />
            <Baris label="Belum jatuh tempo" value={rupiah(pi?.ringkasan?.belum_jatuh_tempo)} />
            <Baris label="Terlambat" value={rupiah(pi?.ringkasan?.terlambat)} />
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Per customer</p>
            {(pi?.per_customer || []).length === 0 && <p className="text-xs text-slate-400">Tidak ada piutang terbuka.</p>}
            {(pi?.per_customer || []).slice(0, 6).map((c) => (
              <div key={c.customer_name} className="flex justify-between text-xs py-0.5">
                <span className="truncate mr-2">{c.customer_name || '-'}</span>
                <span className="font-semibold whitespace-nowrap">{angka(c.sisa)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={`${card} p-4 space-y-2`}>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Utang Supplier</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Baris label="Tagihan terbuka" value={`${ut?.ringkasan?.jumlah_invoice ?? 0}`} />
            <Baris label="Lunas" value={`${ut?.ringkasan?.jumlah_lunas ?? 0}`} />
            <Baris label="Belum jatuh tempo" value={rupiah(ut?.ringkasan?.belum_jatuh_tempo)} />
            <Baris label="Terlambat" value={rupiah(ut?.ringkasan?.terlambat)} />
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Per supplier</p>
            {(ut?.per_supplier || []).length === 0 && <p className="text-xs text-slate-400">Tidak ada utang terbuka.</p>}
            {(ut?.per_supplier || []).slice(0, 6).map((s) => (
              <div key={s.supplier_name} className="flex justify-between text-xs py-0.5">
                <span className="truncate mr-2">{s.supplier_name || '-'}</span>
                <span className="font-semibold whitespace-nowrap">{angka(s.sisa)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <KonfigurasiAlert konfigurasi={data?.konfigurasi?.piutang} label="Piutang Usaha" />
        <KonfigurasiAlert konfigurasi={data?.konfigurasi?.utang} label="Utang Usaha" />
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl px-4 py-3">
        <p className="text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          {pi?.catatan} {ut?.catatan} Retur/credit note belum menjadi pengurang tagihan.
        </p>
      </div>
    </div>
  );
}

function Baris({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">{value}</span>
    </div>
  );
}

/* ══════════════════════════ TAB PIUTANG CUSTOMER ══════════════════════════ */

function TabPiutang({ periode, setPeriode, customers, masterLoading, masterError }) {
  const [rows, setRows] = useState([]);
  const [ringkasan, setRingkasan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Semua');
  const [customerId, setCustomerId] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const muat = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getPiutang({
        from: periode.from,
        to: periode.to,
        status: status === 'Semua' ? undefined : status,
        customer_id: customerId || undefined,
        search: search.trim() || undefined,
      });
      setRows(data.rows || []);
      setRingkasan(data.ringkasan);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[UtangPiutang] piutang gagal:', err);
      setRows([]);
      setRingkasan(null);
      setError(pesanGagal(err, 'Gagal memuat piutang'));
    } finally {
      setLoading(false);
    }
  }, [periode, status, customerId, search]);

  useEffect(() => { muat(); }, [muat]);

  return (
    <div className="space-y-4">
      <FilterPeriode periode={periode} setPeriode={setPeriode}>
        <div>
          <label className={labelClass}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            <option value="Semua">Semua</option>
            {PAYMENT_STATUS.map((s) => <option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div className="min-w-52">
          <label className={labelClass}>Customer</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputClass}
            disabled={masterLoading || Boolean(masterError)}>
            <option value="">
              {masterLoading ? 'Memuat customer...'
                : masterError ? 'Master customer gagal dimuat'
                  : customers.length === 0 ? 'Belum ada data customer' : 'Semua customer'}
            </option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
          </select>
          {!masterLoading && !masterError && customers.length === 0 && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Master customer masih kosong. Tambahkan di menu Master Data → Customer.
            </p>
          )}
        </div>
        <div className="flex-1 min-w-45">
          <label className={labelClass}>Cari</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="No. invoice, customer, SO..." className={`${inputClass} pl-9`} />
          </div>
        </div>
        <button onClick={() => printPiutang({ rows, ringkasan }, { ...periode, status })}
          disabled={loading} className={btnNeutral}>
          <Printer className="h-4 w-4" /> Cetak Piutang
        </button>
      </FilterPeriode>

      <PeringatanMaster pesan={error} loading={loading} onRetry={muat} />

      {ringkasan && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kartu label="Total Piutang Berjalan" nilai={rupiah(ringkasan.total_berjalan)} bold />
          <Kartu label="Belum Jatuh Tempo" nilai={rupiah(ringkasan.belum_jatuh_tempo)} tone="emerald" />
          <Kartu label="Terlambat" nilai={rupiah(ringkasan.terlambat)} tone="rose" />
          <Kartu label="Invoice Terbuka" nilai={`${ringkasan.jumlah_invoice} invoice`} />
        </div>
      )}

      <TabelTagihan
        rows={rows}
        loading={loading}
        jenis="piutang"
        onBukaInvoice={() => goTo('invoice')}
      />
    </div>
  );
}

/* ══════════════════════════ TAB UTANG SUPPLIER ══════════════════════════ */

function TabUtang({ periode, setPeriode, suppliers, masterLoading, masterError }) {
  const [rows, setRows] = useState([]);
  const [ringkasan, setRingkasan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('Semua');
  const [supplierId, setSupplierId] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const muat = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getUtang({
        from: periode.from,
        to: periode.to,
        status: status === 'Semua' ? undefined : status,
        supplier_id: supplierId || undefined,
        search: search.trim() || undefined,
      });
      setRows(data.rows || []);
      setRingkasan(data.ringkasan);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[UtangPiutang] utang gagal:', err);
      setRows([]);
      setRingkasan(null);
      setError(pesanGagal(err, 'Gagal memuat utang supplier'));
    } finally {
      setLoading(false);
    }
  }, [periode, status, supplierId, search]);

  useEffect(() => { muat(); }, [muat]);

  return (
    <div className="space-y-4">
      <FilterPeriode periode={periode} setPeriode={setPeriode}>
        <div>
          <label className={labelClass}>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            <option value="Semua">Semua</option>
            {PAYMENT_STATUS.map((s) => <option key={s} value={s}>{PAYMENT_STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div className="min-w-52">
          <label className={labelClass}>Supplier</label>
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputClass}
            disabled={masterLoading || Boolean(masterError)}>
            <option value="">
              {masterLoading ? 'Memuat supplier...'
                : masterError ? 'Master supplier gagal dimuat'
                  : suppliers.length === 0 ? 'Belum ada data supplier' : 'Semua supplier'}
            </option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
          </select>
          {!masterLoading && !masterError && suppliers.length === 0 && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Master supplier masih kosong. Tambahkan di menu Master Data → Supplier.
            </p>
          )}
        </div>
        <div className="flex-1 min-w-45">
          <label className={labelClass}>Cari</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="No. tagihan / faktur supplier..." className={`${inputClass} pl-9`} />
          </div>
        </div>
        <button onClick={() => printUtang({ rows, ringkasan }, { ...periode, status })}
          disabled={loading} className={btnNeutral}>
          <Printer className="h-4 w-4" /> Cetak Utang
        </button>
      </FilterPeriode>

      <PeringatanMaster pesan={error} loading={loading} onRetry={muat} />

      {ringkasan && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kartu label="Total Utang Berjalan" nilai={rupiah(ringkasan.total_berjalan)} bold />
          <Kartu label="Belum Jatuh Tempo" nilai={rupiah(ringkasan.belum_jatuh_tempo)} />
          <Kartu label="Terlambat" nilai={rupiah(ringkasan.terlambat)} tone="rose" />
          <Kartu label="Tagihan Terbuka" nilai={`${ringkasan.jumlah_invoice} tagihan`} />
        </div>
      )}

      <TabelTagihan rows={rows} loading={loading} jenis="utang" />
    </div>
  );
}

/* ══════════════════════════ Tabel tagihan (dipakai piutang & utang) ══════════════════════════ */

function TabelTagihan({ rows, loading, jenis }) {
  const isPiutang = jenis === 'piutang';

  return (
    <div className={`${card} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3 text-left">{isPiutang ? 'No. Invoice' : 'No. Tagihan'}</th>
              <th className="px-4 py-3 text-left">{isPiutang ? 'Customer' : 'Supplier'}</th>
              <th className="px-4 py-3 text-left">Tanggal</th>
              <th className="px-4 py-3 text-left">Jatuh Tempo</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Dibayar</th>
              <th className="px-4 py-3 text-right">Sisa</th>
              <th className="px-4 py-3 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Memuat data...</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                {isPiutang
                  ? 'Belum ada invoice penjualan pada filter ini. Terbitkan invoice dari menu Sales → Invoice.'
                  : 'Belum ada tagihan supplier. Buat Purchase Invoice terlebih dahulu.'}
              </td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <td className="px-4 py-3 font-mono text-xs">{r.invoice_number}</td>
                <td className="px-4 py-3 text-xs">{isPiutang ? r.customer_name : r.supplier_name}</td>
                <td className="px-4 py-3 text-xs whitespace-nowrap">{formatTanggal(r.invoice_date)}</td>
                <td className="px-4 py-3 text-xs whitespace-nowrap">
                  {formatTanggal(r.due_date)}
                  {r.umur_hari > 0 && (
                    <span className="ml-1 text-[10px] text-rose-600 dark:text-rose-400">(+{r.umur_hari} hr)</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">{angka(r.total)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">{angka(r.dibayar)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap font-semibold">{angka(r.sisa)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={statusBadge(r.status)}>{PAYMENT_STATUS_LABEL[r.status] || r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!isPiutang && (
        <div className="px-4 py-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          Tagihan yang belum diposting ke jurnal tidak boleh dibayar.
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════ TAB PENERIMAAN CUSTOMER ══════════════════════════ */

const requestKeyBaru = () =>
  (window.crypto?.randomUUID ? window.crypto.randomUUID() : `req-${Date.now()}-${Math.random().toString(36).slice(2)}`);

function TabPenerimaan({ customers, masterLoading, masterError, onSaved }) {
  const [cashBanks, setCashBanks] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);

  const [customerId, setCustomerId] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [form, setForm] = useState({
    payment_date: todayISODate(),
    cash_bank_id: '',
    reference_number: '',
    notes: '',
    amount: '',
  });
  const [alokasi, setAlokasi] = useState([]); // [{ invoice_id, amount }]
  const [requestKey, setRequestKey] = useState(requestKeyBaru);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getCashBanks();
        setCashBanks(data.filter((c) => c.is_active));
      } catch (err) {
        swalError('Gagal memuat Kas/Bank', err.response?.data?.message);
      }
    })();
  }, []);

  const muatRiwayat = useCallback(async () => {
    setLoadingRiwayat(true);
    try {
      const { data } = await getPenerimaanCustomer();
      setRiwayat(data);
    } catch (err) {
      swalError('Gagal memuat riwayat penerimaan', err.response?.data?.message);
    } finally {
      setLoadingRiwayat(false);
    }
  }, []);

  useEffect(() => { muatRiwayat(); }, [muatRiwayat]);

  /* Ambil invoice customer yang masih punya sisa. */
  const muatInvoice = useCallback(async (cid) => {
    if (!cid) { setInvoices([]); return; }
    setLoadingInvoice(true);
    try {
      const { data } = await getPiutang({ customer_id: cid });
      setInvoices((data.rows || []).filter((r) => r.sisa > 0.009));
    } catch (err) {
      swalError('Gagal memuat invoice customer', err.response?.data?.message);
    } finally {
      setLoadingInvoice(false);
    }
  }, []);

  const gantiCustomer = async (cid) => {
    setCustomerId(cid);
    setAlokasi([]);
    setForm((f) => ({ ...f, amount: '' }));
    await muatInvoice(cid);
  };

  const nominalAmount = Number(form.amount) || 0;
  const totalAlokasi = useMemo(
    () => alokasi.reduce((s, a) => s + (Number(a.amount) || 0), 0),
    [alokasi]
  );

  const tambahAlokasi = (inv) => {
    setAlokasi((prev) => {
      if (prev.some((a) => String(a.invoice_id) === String(inv.id))) return prev;
      const sisa = inv.sisa;
      const sisaNominal = Math.max(nominalAmount - totalAlokasi, 0);
      const isi = Math.min(sisa, sisaNominal || sisa);
      return [...prev, { invoice_id: inv.id, amount: isi ? String(isi) : '' }];
    });
  };

  const buangAlokasi = (id) => setAlokasi((prev) => prev.filter((a) => String(a.invoice_id) !== String(id)));

  const ubahAlokasi = (id, value) => setAlokasi((prev) =>
    prev.map((a) => (String(a.invoice_id) === String(id) ? { ...a, amount: value } : a)));

  /** Tandai seluruh sisa piutang untuk invoice ini. */
  const lunasi = (inv) => {
    setAlokasi((prev) => prev.map((a) => (
      String(a.invoice_id) === String(inv.id) ? { ...a, amount: String(inv.sisa) } : a
    )));
    setForm((f) => ({
      ...f,
      amount: String(round2(totalAlokasi - (Number(alokasi.find((a) => String(a.invoice_id) === String(inv.id))?.amount) || 0) + inv.sisa)),
    }));
  };

  const validasi = () => {
    if (!customerId) return 'Pilih customer terlebih dahulu.';
    if (!form.payment_date) return 'Tanggal penerimaan wajib diisi.';
    if (!form.cash_bank_id) return 'Pilih akun Kas/Bank tujuan.';
    if (!(Number(form.amount) > 0)) return 'Jumlah diterima harus lebih dari nol.';
    if (alokasi.length === 0) return 'Pilih minimal satu invoice yang dibayar.';
    for (const a of alokasi) {
      if (!(Number(a.amount) > 0)) return 'Setiap alokasi invoice harus lebih dari nol.';
    }
    if (Math.abs(totalAlokasi - nominalAmount) > 0.009) {
      return `Total alokasi (${rupiah(totalAlokasi)}) harus sama dengan jumlah diterima (${rupiah(nominalAmount)}).`;
    }
    return '';
  };

  const simpan = async () => {
    const err = validasi();
    if (err) return setError(err);

    setSaving(true);
    setError('');
    try {
      const { data } = await createPenerimaanCustomer({
        customer_id: Number(customerId),
        cash_bank_id: Number(form.cash_bank_id),
        payment_date: form.payment_date,
        amount: Number(form.amount),
        reference_number: form.reference_number || null,
        notes: form.notes || null,
        request_key: requestKey,
        allocations: alokasi.map((a) => ({ invoice_id: Number(a.invoice_id), amount: Number(a.amount) })),
      });

      swalSuccess(data.message || 'Penerimaan berhasil diposting.');
      // Reset form + kunci request baru supaya tidak terkirim ganda.
      setForm({ payment_date: todayISODate(), cash_bank_id: form.cash_bank_id, reference_number: '', notes: '', amount: '' });
      setAlokasi([]);
      setRequestKey(requestKeyBaru());
      await muatInvoice(customerId);
      await muatRiwayat();
      onSaved?.();
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal menyimpan penerimaan.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`${card} p-5 space-y-4`}>
        <div className="flex items-center gap-2">
          <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Penerimaan dari Customer</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Customer <span className="text-red-500">*</span></label>
            <select value={customerId} onChange={(e) => gantiCustomer(e.target.value)} className={inputClass}
              disabled={masterLoading || Boolean(masterError)}>
              <option value="">
                {masterLoading ? 'Memuat customer...'
                  : masterError ? 'Master customer gagal dimuat'
                    : customers.length === 0 ? 'Belum ada data customer' : '— Pilih customer —'}
              </option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.nama}</option>)}
            </select>
            {!masterLoading && !masterError && customers.length === 0 && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Tambahkan customer di menu Master Data → Customer sebelum mencatat penerimaan.
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Tanggal <span className="text-red-500">*</span></label>
            <input type="date" value={form.payment_date}
              onChange={(e) => setForm({ ...form, payment_date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Kas/Bank Tujuan <span className="text-red-500">*</span></label>
            <select value={form.cash_bank_id}
              onChange={(e) => setForm({ ...form, cash_bank_id: e.target.value })} className={inputClass}>
              <option value="">— Pilih kas/bank —</option>
              {cashBanks.map((c) => <option key={c.id} value={c.id}>{c.nama_tampilan} ({c.kode_akun})</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Jumlah Diterima <span className="text-red-500">*</span></label>
            <input type="number" min="0" step="0.01" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0" className={`${inputClass} text-right`} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>No. Referensi</label>
            <input value={form.reference_number}
              onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
              placeholder="Opsional" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Keterangan</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Uraian penerimaan" className={inputClass} />
          </div>
        </div>

        {cashBanks.length === 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Belum ada Kas/Bank aktif. Tambahkan master di menu Akuntansi → Kas &amp; Bank.
          </p>
        )}
      </div>

      {/* Invoice yang dibayar */}
      <div className={`${card} overflow-hidden`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Invoice customer yang belum lunas</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Total alokasi: <strong>{rupiah(totalAlokasi)}</strong> / {rupiah(nominalAmount)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">No. Invoice</th>
                <th className="px-4 py-3 text-left">Jatuh Tempo</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Sisa</th>
                <th className="px-4 py-3 text-right w-40">Alokasi</th>
                <th className="px-4 py-3 text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingInvoice && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Memuat invoice...</td></tr>}
              {!loadingInvoice && customerId && invoices.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Customer ini tidak memiliki invoice terbuka.
                </td></tr>
              )}
              {!customerId && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Pilih customer dulu.</td></tr>}
              {invoices.map((inv) => {
                const alok = alokasi.find((a) => String(a.invoice_id) === String(inv.id));
                return (
                  <tr key={inv.id} className={alok ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}>
                    <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{formatTanggal(inv.due_date)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{angka(inv.total)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-semibold">{angka(inv.sisa)}</td>
                    <td className="px-4 py-3">
                      <input type="number" min="0" step="0.01" disabled={!alok}
                        value={alok?.amount ?? ''}
                        onChange={(e) => ubahAlokasi(inv.id, e.target.value)}
                        placeholder="0" className={`${inputClass} py-1.5 text-xs text-right`} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center">
                        {!alok ? (
                          <button onClick={() => tambahAlokasi(inv)} className={btnGhost}>
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <>
                            <button onClick={() => lunasi(inv)} title="Lunasi sisa"
                              className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition cursor-pointer">
                              Lunasi
                            </button>
                            <button onClick={() => buangAlokasi(inv.id)} title="Batalkan alokasi"
                              className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button onClick={simpan} disabled={saving || !customerId} className={btnPrimary}>
          <Save className="h-4 w-4" /> {saving ? 'Memproses...' : 'Simpan & Posting Penerimaan'}
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Jurnal: Debit Kas/Bank · Kredit Piutang Usaha. Kelebihan bayar ditolak.
        </p>
      </div>

      <RiwayatPenerimaan rows={riwayat} loading={loadingRiwayat} />
    </div>
  );
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function RiwayatPenerimaan({ rows, loading }) {
  return (
    <div className={`${card} overflow-hidden`}>
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Riwayat Penerimaan</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-300">
            <tr>
              <th className="px-4 py-3 text-left">No. Penerimaan</th>
              <th className="px-4 py-3 text-left">Tanggal</th>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Kas/Bank</th>
              <th className="px-4 py-3 text-right">Jumlah</th>
              <th className="px-4 py-3 text-left">Alokasi Invoice</th>
              <th className="px-4 py-3 text-center">Jurnal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Memuat...</td></tr>}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Belum ada penerimaan.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-mono text-xs">{r.receipt_number}</td>
                <td className="px-4 py-3 text-xs whitespace-nowrap">{formatTanggal(r.payment_date)}</td>
                <td className="px-4 py-3 text-xs">{r.customer?.customer_name}</td>
                <td className="px-4 py-3 text-xs">{r.cash_bank?.nama_tampilan}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">{angka(r.amount)}</td>
                <td className="px-4 py-3 text-xs">
                  {(r.allocations || []).map((a) => `${a.invoice?.invoice_number || '-'} (${angka(a.amount)})`).join(', ')}
                </td>
                <td className="px-4 py-3 text-center text-xs font-mono">
                  {r.journal_voucher?.no_voucher || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TAB PEMBAYARAN SUPPLIER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function TabPembayaran({ suppliers, masterLoading, masterError, onSaved }) {
  const [cashBanks, setCashBanks] = useState([]);
  const [riwayat, setRiwayat] = useState([]);
  const [loadingRiwayat, setLoadingRiwayat] = useState(true);

  const [supplierId, setSupplierId] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [form, setForm] = useState({
    payment_date: todayISODate(),
    cash_bank_id: '',
    reference_number: '',
    notes: '',
    amount: '',
  });
  const [alokasi, setAlokasi] = useState([]);
  const [requestKey, setRequestKey] = useState(requestKeyBaru);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getCashBanks();
        setCashBanks(data.filter((c) => c.is_active));
      } catch (err) {
        swalError('Gagal memuat Kas/Bank', err.response?.data?.message);
      }
    })();
  }, []);

  const muatRiwayat = useCallback(async () => {
    setLoadingRiwayat(true);
    try {
      const { data } = await getPembayaranSupplier();
      setRiwayat(data);
    } catch (err) {
      swalError('Gagal memuat riwayat pembayaran', err.response?.data?.message);
    } finally {
      setLoadingRiwayat(false);
    }
  }, []);

  useEffect(() => { muatRiwayat(); }, [muatRiwayat]);

  const muatInvoice = useCallback(async (sid) => {
    if (!sid) { setInvoices([]); return; }
    setLoadingInvoice(true);
    try {
      const { data } = await getUtang({ supplier_id: sid });
      setInvoices((data.rows || []).filter((r) => r.sisa > 0.009 && r.journal_status === 'POSTED'));
    } catch (err) {
      swalError('Gagal memuat tagihan supplier', err.response?.data?.message);
    } finally {
      setLoadingInvoice(false);
    }
  }, []);

  const gantiSupplier = async (sid) => {
    setSupplierId(sid);
    setAlokasi([]);
    setForm((f) => ({ ...f, amount: '' }));
    await muatInvoice(sid);
  };

  const nominalAmount = Number(form.amount) || 0;
  const totalAlokasi = useMemo(
    () => alokasi.reduce((s, a) => s + (Number(a.amount) || 0), 0),
    [alokasi]
  );

  const tambahAlokasi = (inv) => {
    setAlokasi((prev) => {
      if (prev.some((a) => String(a.purchase_invoice_id) === String(inv.id))) return prev;
      const sisaNominal = Math.max(nominalAmount - totalAlokasi, 0);
      const isi = Math.min(inv.sisa, sisaNominal || inv.sisa);
      return [...prev, { purchase_invoice_id: inv.id, amount: isi ? String(isi) : '' }];
    });
  };

  const buangAlokasi = (id) => setAlokasi((prev) => prev.filter((a) => String(a.purchase_invoice_id) !== String(id)));
  const ubahAlokasi = (id, value) => setAlokasi((prev) =>
    prev.map((a) => (String(a.purchase_invoice_id) === String(id) ? { ...a, amount: value } : a)));

  const validasi = () => {
    if (!supplierId) return 'Pilih supplier terlebih dahulu.';
    if (!form.payment_date) return 'Tanggal pembayaran wajib diisi.';
    if (!form.cash_bank_id) return 'Pilih akun Kas/Bank sumber.';
    if (!(Number(form.amount) > 0)) return 'Jumlah dibayar harus lebih dari nol.';
    if (alokasi.length === 0) return 'Pilih minimal satu tagihan supplier.';
    for (const a of alokasi) {
      if (!(Number(a.amount) > 0)) return 'Setiap alokasi tagihan harus lebih dari nol.';
    }
    if (Math.abs(totalAlokasi - nominalAmount) > 0.009) {
      return `Total alokasi (${rupiah(totalAlokasi)}) harus sama dengan jumlah dibayar (${rupiah(nominalAmount)}).`;
    }
    return '';
  };

  const simpan = async () => {
    const err = validasi();
    if (err) return setError(err);

    setSaving(true);
    setError('');
    try {
      const { data } = await createPembayaranSupplier({
        supplier_id: Number(supplierId),
        cash_bank_id: Number(form.cash_bank_id),
        payment_date: form.payment_date,
        amount: Number(form.amount),
        reference_number: form.reference_number || null,
        notes: form.notes || null,
        request_key: requestKey,
        allocations: alokasi.map((a) => ({
          purchase_invoice_id: Number(a.purchase_invoice_id),
          amount: Number(a.amount),
        })),
      });

      swalSuccess(data.message || 'Pembayaran berhasil diposting.');
      setForm({ payment_date: todayISODate(), cash_bank_id: form.cash_bank_id, reference_number: '', notes: '', amount: '' });
      setAlokasi([]);
      setRequestKey(requestKeyBaru());
      await muatInvoice(supplierId);
      await muatRiwayat();
      onSaved?.();
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal menyimpan pembayaran.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`${card} p-5 space-y-4`}>
        <div className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5 text-rose-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Pembayaran ke Supplier</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Supplier <span className="text-red-500">*</span></label>
            <select value={supplierId} onChange={(e) => gantiSupplier(e.target.value)} className={inputClass}
              disabled={masterLoading || Boolean(masterError)}>
              <option value="">
                {masterLoading ? 'Memuat supplier...'
                  : masterError ? 'Master supplier gagal dimuat'
                    : suppliers.length === 0 ? 'Belum ada data supplier' : '— Pilih supplier —'}
              </option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.nama}</option>)}
            </select>
            {!masterLoading && !masterError && suppliers.length === 0 && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Tambahkan supplier di menu Master Data → Supplier sebelum mencatat pembayaran.
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Tanggal <span className="text-red-500">*</span></label>
            <input type="date" value={form.payment_date}
              onChange={(e) => setForm({ ...form, payment_date: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Kas/Bank Sumber <span className="text-red-500">*</span></label>
            <select value={form.cash_bank_id}
              onChange={(e) => setForm({ ...form, cash_bank_id: e.target.value })} className={inputClass}>
              <option value="">â€” Pilih kas/bank â€”</option>
              {cashBanks.map((c) => <option key={c.id} value={c.id}>{c.nama_tampilan} ({c.kode_akun})</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Jumlah Dibayar <span className="text-red-500">*</span></label>
            <input type="number" min="0" step="0.01" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0" className={`${inputClass} text-right`} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>No. Referensi</label>
            <input value={form.reference_number}
              onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
              placeholder="Opsional" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Keterangan</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Uraian pembayaran" className={inputClass} />
          </div>
        </div>
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Tagihan supplier yang belum lunas</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Total alokasi: <strong>{rupiah(totalAlokasi)}</strong> / {rupiah(nominalAmount)}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">No. Tagihan</th>
                <th className="px-4 py-3 text-left">Jatuh Tempo</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Sisa</th>
                <th className="px-4 py-3 text-right w-40">Alokasi</th>
                <th className="px-4 py-3 text-center w-32">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingInvoice && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Memuat tagihan...</td></tr>}
              {!loadingInvoice && supplierId && invoices.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Tidak ada tagihan posted yang masih bersaldo.
                </td></tr>
              )}
              {!supplierId && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Pilih supplier dulu.</td></tr>}
              {invoices.map((inv) => {
                const alok = alokasi.find((a) => String(a.purchase_invoice_id) === String(inv.id));
                return (
                  <tr key={inv.id} className={alok ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}>
                    <td className="px-4 py-3 font-mono text-xs">
                      {inv.invoice_number}
                      {inv.supplier_invoice_number && (
                        <span className="block text-[10px] text-slate-400">Faktur: {inv.supplier_invoice_number}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{formatTanggal(inv.due_date)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">{angka(inv.total)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-semibold">{angka(inv.sisa)}</td>
                    <td className="px-4 py-3">
                      <input type="number" min="0" step="0.01" disabled={!alok}
                        value={alok?.amount ?? ''}
                        onChange={(e) => ubahAlokasi(inv.id, e.target.value)}
                        placeholder="0" className={`${inputClass} py-1.5 text-xs text-right`} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center">
                        {!alok ? (
                          <button onClick={() => tambahAlokasi(inv)} className={btnGhost}>
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button onClick={() => buangAlokasi(inv.id)} title="Batalkan alokasi"
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button onClick={simpan} disabled={saving || !supplierId} className={btnPrimary}>
          <Save className="h-4 w-4" /> {saving ? 'Memproses...' : 'Simpan & Posting Pembayaran'}
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Jurnal: Debit Utang Usaha Â· Kredit Kas/Bank sumber.
        </p>
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Riwayat Pembayaran Supplier</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">No. Pembayaran</th>
                <th className="px-4 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3 text-left">Supplier</th>
                <th className="px-4 py-3 text-left">Kas/Bank</th>
                <th className="px-4 py-3 text-right">Jumlah</th>
                <th className="px-4 py-3 text-left">Alokasi Tagihan</th>
                <th className="px-4 py-3 text-center">Jurnal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loadingRiwayat && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Memuat...</td></tr>}
              {!loadingRiwayat && riwayat.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Belum ada pembayaran.</td></tr>
              )}
              {riwayat.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-mono text-xs">{r.payment_number}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{formatTanggal(r.payment_date)}</td>
                  <td className="px-4 py-3 text-xs">{r.supplier?.supplier_name}</td>
                  <td className="px-4 py-3 text-xs">{r.cash_bank?.nama_tampilan}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{angka(r.amount)}</td>
                  <td className="px-4 py-3 text-xs">
                    {(r.allocations || []).map((a) => `${a.purchase_invoice?.invoice_number || '-'} (${angka(a.amount)})`).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-center text-xs font-mono">{r.journal_voucher?.no_voucher || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TAB UMUR TAGIHAN â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

const AGING_LABEL = [
  ['belum_jatuh_tempo', 'Belum jatuh tempo'],
  ['1_30', '1 - 30 hari'],
  ['31_60', '31 - 60 hari'],
  ['61_90', '61 - 90 hari'],
  ['lebih_90', '> 90 hari'],
];

function TabAging({ periode, setPeriode }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jenis, setJenis] = useState('piutang');
  const [error, setError] = useState('');

  const muat = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await getRpAging({ from: periode.from, to: periode.to });
      setData(res);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[UtangPiutang] aging gagal:', err);
      setData(null);
      setError(pesanGagal(err, 'Gagal memuat umur tagihan'));
    } finally {
      setLoading(false);
    }
  }, [periode]);

  useEffect(() => { muat(); }, [muat]);

  const bucket = data?.[jenis] || {};
  const detail = (jenis === 'piutang' ? data?.detail_piutang : data?.detail_utang) || [];
  const total = Object.values(bucket).reduce((s, v) => s + Number(v || 0), 0);

  return (
    <div className="space-y-4">
      <FilterPeriode periode={periode} setPeriode={setPeriode}>
        <div>
          <label className={labelClass}>Jenis</label>
          <select value={jenis} onChange={(e) => setJenis(e.target.value)} className={inputClass}>
            <option value="piutang">Piutang Customer</option>
            <option value="utang">Utang Supplier</option>
          </select>
        </div>
        <button onClick={() => printUmurTagihan(data, { ...periode, jenis })} disabled={!data} className={btnNeutral}>
          <Printer className="h-4 w-4" /> Cetak Umur Tagihan
        </button>
      </FilterPeriode>

      <PeringatanMaster pesan={error} loading={loading} onRetry={muat} />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {AGING_LABEL.map(([key, label]) => (
          <Kartu key={key} label={label} nilai={rupiah(bucket[key])}
            tone={key === 'lebih_90' ? 'rose' : key === 'belum_jatuh_tempo' ? 'emerald' : undefined} />
        ))}
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Rincian {jenis === 'piutang' ? 'Piutang' : 'Utang'} Belum Lunas
          </h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">Total {rupiah(total)}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">Dokumen</th>
                <th className="px-4 py-3 text-left">{jenis === 'piutang' ? 'Customer' : 'Supplier'}</th>
                <th className="px-4 py-3 text-left">Jatuh Tempo</th>
                <th className="px-4 py-3 text-right">Umur (hari)</th>
                <th className="px-4 py-3 text-right">Sisa</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-400">Memuat...</td></tr>}
              {!loading && detail.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Tidak ada tagihan belum lunas.</td></tr>
              )}
              {detail.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-mono text-xs">{r.invoice_number}</td>
                  <td className="px-4 py-3 text-xs">{jenis === 'piutang' ? r.customer_name : r.supplier_name}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{formatTanggal(r.due_date)}</td>
                  <td className={`px-4 py-3 text-right whitespace-nowrap ${r.umur_hari > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}`}>
                    {r.umur_hari ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap font-semibold">{angka(r.sisa)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={statusBadge(r.status)}>{PAYMENT_STATUS_LABEL[r.status] || r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TAB LAPORAN & RIWAYAT â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function TabRiwayat({ periode, setPeriode }) {
  const [penerimaan, setPenerimaan] = useState([]);
  const [pembayaran, setPembayaran] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jenis, setJenis] = useState('penerimaan');
  const [error, setError] = useState('');

  const muat = useCallback(async () => {
    setLoading(true);
    setError('');
    const [rc, py] = await Promise.allSettled([
      getPenerimaanCustomer({ from: periode.from, to: periode.to }),
      getPembayaranSupplier({ from: periode.from, to: periode.to }),
    ]);

    setPenerimaan(rc.status === 'fulfilled' ? (rc.value.data || []) : []);
    setPembayaran(py.status === 'fulfilled' ? (py.value.data || []) : []);

    const gagal = [];
    if (rc.status === 'rejected') gagal.push(pesanGagal(rc.reason, 'Penerimaan customer gagal dimuat'));
    if (py.status === 'rejected') gagal.push(pesanGagal(py.reason, 'Pembayaran supplier gagal dimuat'));
    if (gagal.length) {
      if (import.meta.env.DEV) console.error('[UtangPiutang] riwayat gagal:', rc.reason, py.reason);
    }
    setError(gagal.join(' · '));
    setLoading(false);
  }, [periode]);

  useEffect(() => { muat(); }, [muat]);

  const rows = jenis === 'penerimaan' ? penerimaan : pembayaran;
  const totalPenerimaan = penerimaan.reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalPembayaran = pembayaran.reduce((s, r) => s + Number(r.amount || 0), 0);

  return (
    <div className="space-y-4">
      <FilterPeriode periode={periode} setPeriode={setPeriode}>
        <div>
          <label className={labelClass}>Jenis</label>
          <select value={jenis} onChange={(e) => setJenis(e.target.value)} className={inputClass}>
            <option value="penerimaan">Penerimaan Customer</option>
            <option value="pembayaran">Pembayaran Supplier</option>
          </select>
        </div>
        <button onClick={() => window.print()} className={btnGhost}>
          <Printer className="h-4 w-4" /> Cetak Halaman
        </button>
      </FilterPeriode>

      <PeringatanMaster pesan={error} loading={loading} onRetry={muat} />

      <div className="grid grid-cols-2 gap-3">
        <Kartu label="Total Penerimaan Periode" nilai={rupiah(totalPenerimaan)} tone="emerald" />
        <Kartu label="Total Pembayaran Periode" nilai={rupiah(totalPembayaran)} tone="rose" />
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">No. Dokumen</th>
                <th className="px-4 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3 text-left">{jenis === 'penerimaan' ? 'Customer' : 'Supplier'}</th>
                <th className="px-4 py-3 text-left">Kas/Bank</th>
                <th className="px-4 py-3 text-left">Referensi</th>
                <th className="px-4 py-3 text-right">Jumlah</th>
                <th className="px-4 py-3 text-center">Jurnal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Memuat...</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Tidak ada transaksi pada periode ini.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-mono text-xs">{r.receipt_number || r.payment_number}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{formatTanggal(r.payment_date)}</td>
                  <td className="px-4 py-3 text-xs">{r.customer?.customer_name || r.supplier?.supplier_name}</td>
                  <td className="px-4 py-3 text-xs">{r.cash_bank?.nama_tampilan}</td>
                  <td className="px-4 py-3 text-xs">{r.reference_number || '-'}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{angka(r.amount)}</td>
                  <td className="px-4 py-3 text-center text-xs font-mono">{r.journal_voucher?.no_voucher || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

