import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Wallet, RefreshCw, Plus, Pencil, Power, Trash2, Printer, Save, Search,
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, AlertTriangle, Info, ExternalLink,
} from 'lucide-react';
import {
  getCashBanks, createCashBank, updateCashBank, deleteCashBank, toggleCashBankStatus,
  getAkunTersediaUntukCashBank, getCashBankSaldoAwal, simpanCashBankSaldoAwal,
  getCashBankRingkasan, getCashBankMutasi,
  createCashBankPenerimaan, createCashBankPengeluaran, createCashBankTransfer,
  getAccounts,
  rupiah, angka, formatTanggal, periodeDefault, todayISODate, VOUCHER_TYPES,
} from '../../services/accountingApi';
import { printKasBankRingkasan, printKasBankMutasi } from '../../utils/accountingPrint';
import { swalError, swalSuccess, swalConfirm } from '../../utils/swal';

/**
 * Kas & Bank.
 *
 * Sumber kebenaran tunggal: COA (accounts) + Journal Voucher existing.
 * Halaman ini TIDAK menyimpan saldo sendiri — semua angka dibaca dari backend.
 * Tab Saldo Awal hanya menulis accounts.saldo_awal akun Kas/Bank terdaftar.
 */

const TABS = [
  { key: 'ringkasan', label: 'Ringkasan' },
  { key: 'master', label: 'Daftar Kas & Rekening Bank' },
  { key: 'saldo-awal', label: 'Saldo Awal' },
  { key: 'penerimaan', label: 'Penerimaan' },
  { key: 'pengeluaran', label: 'Pengeluaran' },
  { key: 'transfer', label: 'Transfer Antar Kas/Bank' },
  { key: 'mutasi', label: 'Mutasi' },
];

const inputClass =
  'w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500';
const labelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1';
const btnPrimary =
  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';
const btnNeutral =
  'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-700 text-white hover:bg-slate-800 transition shadow-sm cursor-pointer disabled:opacity-60';
const btnGhost =
  'inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer';
const card = 'bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm';

const FORM_KOSONG = {
  account_id: '',
  jenis: 'BANK',
  nama_tampilan: '',
  nama_bank: '',
  cabang: '',
  nomor_rekening: '',
  nama_pemilik: '',
  keterangan: '',
  is_active: true,
};

export default function KasBank() {
  const [tab, setTab] = useState('ringkasan');
  const [periode, setPeriode] = useState(periodeDefault());

  /* --- data bersama --- */
  const [ringkasan, setRingkasan] = useState(null);
  const [master, setMaster] = useState([]);
  const [loading, setLoading] = useState(true);

  const muatRingkasan = useCallback(async () => {
    try {
      const { data } = await getCashBankRingkasan({ from: periode.from, to: periode.to });
      setRingkasan(data);
    } catch (err) {
      swalError('Gagal memuat ringkasan Kas & Bank', err.response?.data?.message);
    }
  }, [periode]);

  const muatMaster = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getCashBanks();
      setMaster(data);
    } catch (err) {
      swalError('Gagal memuat master Kas & Bank', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const muatSemua = useCallback(async () => {
    await muatMaster();
    await muatRingkasan();
  }, [muatMaster, muatRingkasan]);

  useEffect(() => { muatSemua(); }, [muatSemua]);

  /** Untuk mengingatkan bahwa transaksi baru sudah masuk jurnal. */
  const bukaJurnalUmum = () => {
    window.dispatchEvent(new CustomEvent('aldigens:goto', { detail: 'accounting-journal' }));
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header halaman */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2.5 rounded-xl shadow">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Kas &amp; Bank</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Master kas/rekening, saldo awal, penerimaan, pengeluaran, dan transfer — terhubung ke Chart of Account
            </p>
          </div>
        </div>
        <button onClick={muatSemua}
          className={btnGhost}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Muat Ulang</span>
        </button>
      </div>

      {/* Tab */}
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

      {tab === 'ringkasan' && (
        <TabRingkasan
          data={ringkasan}
          periode={periode}
          setPeriode={setPeriode}
          onPrint={() => printKasBankRingkasan(ringkasan, periode)}
          onGoSaldoAwal={() => setTab('saldo-awal')}
        />
      )}

      {tab === 'master' && (
        <TabMaster
          master={master}
          loading={loading}
          onReload={muatSemua}
          onGoCoa={() => window.dispatchEvent(new CustomEvent('aldigens:goto', { detail: 'accounting-coa' }))}
        />
      )}

      {tab === 'saldo-awal' && (
        <TabSaldoAwal onChanged={muatSemua} onGoCoa={() => window.dispatchEvent(new CustomEvent('aldigens:goto', { detail: 'accounting-coa' }))} />
      )}

      {tab === 'penerimaan' && (
        <TabTransaksi
          mode="penerimaan"
          master={master}
          onChanged={muatSemua}
          onBukaJurnal={bukaJurnalUmum}
        />
      )}

      {tab === 'pengeluaran' && (
        <TabTransaksi
          mode="pengeluaran"
          master={master}
          onChanged={muatSemua}
          onBukaJurnal={bukaJurnalUmum}
        />
      )}

      {tab === 'transfer' && (
        <TabTransaksi
          mode="transfer"
          master={master}
          onChanged={muatSemua}
          onBukaJurnal={bukaJurnalUmum}
        />
      )}

      {tab === 'mutasi' && (
        <TabMutasi master={master} periode={periode} setPeriode={setPeriode} onBukaJurnal={bukaJurnalUmum} />
      )}
    </div>
  );
}

/* ═════════════════════════════════ TAB RINGKASAN ═════════════════════════════════ */

function TabRingkasan({ data, periode, setPeriode, onPrint, onGoSaldoAwal }) {
  const rekening = data?.rekening || [];

  return (
    <div className="space-y-4">
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
        <button onClick={onPrint} disabled={!data} className={btnNeutral}>
          <Printer className="h-4 w-4" /> Cetak Ringkasan
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Penerimaan/pengeluaran dihitung pada periode; saldo akhir selalu dari saldo awal + seluruh jurnal POSTED.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kartu label="Total Saldo Awal" nilai={rupiah(data?.total_saldo_awal)} />
        <Kartu label="Total Penerimaan (periode)" nilai={rupiah(data?.total_penerimaan)} tone="emerald" />
        <Kartu label="Total Pengeluaran (periode)" nilai={rupiah(data?.total_pengeluaran)} tone="rose" />
        <Kartu label="Total Saldo Akhir" nilai={rupiah(data?.total_saldo_akhir)} bold />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Kartu label="Kas Aktif" nilai={String(data?.jumlah_kas ?? 0)} small />
        <Kartu label="Bank Aktif" nilai={String(data?.jumlah_bank ?? 0)} small />
      </div>

      {(data?.peringatan?.length ?? 0) > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3">
          <p className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Perlu dilengkapi
          </p>
          <ul className="list-disc pl-6 mt-1 space-y-0.5">
            {data.peringatan.map((p, i) => (
              <li key={i} className="text-xs text-amber-700 dark:text-amber-300">{p}</li>
            ))}
          </ul>
          <button onClick={onGoSaldoAwal} className="mt-2 text-xs font-semibold text-amber-800 dark:text-amber-200 underline cursor-pointer">
            Buka tab Saldo Awal
          </button>
        </div>
      )}

      <div className={`${card} overflow-hidden`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Saldo &amp; Mutasi per Kas/Rekening</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">Nama Kas / Bank</th>
                <th className="px-4 py-3 text-left">Jenis</th>
                <th className="px-4 py-3 text-left">Akun COA</th>
                <th className="px-4 py-3 text-right">Saldo Awal</th>
                <th className="px-4 py-3 text-right">Masuk</th>
                <th className="px-4 py-3 text-right">Keluar</th>
                <th className="px-4 py-3 text-right">Saldo Akhir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rekening.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Belum ada master Kas/Bank. Buka tab “Daftar Kas &amp; Rekening Bank”.
                </td></tr>
              )}
              {rekening.map((r) => (
                <tr key={r.id} className={r.is_active ? '' : 'opacity-60'}>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {r.nama_tampilan}
                    {!r.is_active && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700">Nonaktif</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">{r.jenis}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{r.kode_akun} — {r.nama_akun}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{angka(r.saldo_awal)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{angka(r.mutasi_debit)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{angka(r.mutasi_kredit)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap font-semibold">{angka(r.saldo_akhir)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kartu({ label, nilai, tone, bold, small }) {
  const color = tone === 'emerald'
    ? 'text-emerald-600 dark:text-emerald-400'
    : tone === 'rose' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white';
  return (
    <div className={`${card} p-3`}>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`${small ? 'text-sm' : 'text-lg'} font-bold ${color} ${bold ? 'text-xl' : ''}`}>{nilai}</p>
    </div>
  );
}

/* ═════════════════════════════════ TAB MASTER ═════════════════════════════════ */

function TabMaster({ master, loading, onReload, onGoCoa }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(FORM_KOSONG);
  const [akunTersedia, setAkunTersedia] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const muatAkun = async () => {
    try {
      const { data } = await getAkunTersediaUntukCashBank();
      setAkunTersedia(data);
    } catch (err) {
      swalError('Gagal memuat akun COA', err.response?.data?.message);
    }
  };

  const bukaTambah = async () => {
    setForm(FORM_KOSONG);
    setEditId(null);
    setError('');
    setModalOpen(true);
    await muatAkun();
  };

  const bukaEdit = async (cb) => {
    setForm({
      account_id: String(cb.account_id),
      jenis: cb.jenis,
      nama_tampilan: cb.nama_tampilan || '',
      nama_bank: cb.nama_bank || '',
      cabang: cb.cabang || '',
      nomor_rekening: cb.nomor_rekening || '',
      nama_pemilik: cb.nama_pemilik || '',
      keterangan: cb.keterangan || '',
      is_active: cb.is_active,
    });
    setEditId(cb.id);
    setError('');
    setModalOpen(true);
    await muatAkun();
  };

  const simpan = async () => {
    if (!form.account_id) return setError('Akun COA wajib dipilih.');
    if (!form.nama_tampilan.trim()) return setError('Nama tampilan wajib diisi.');
    if (form.jenis === 'BANK' && !form.nama_bank.trim()) return setError('Nama bank wajib diisi untuk jenis BANK.');

    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        account_id: Number(form.account_id),
        nama_bank: form.nama_bank || null,
        cabang: form.cabang || null,
        nomor_rekening: form.nomor_rekening || null,
        nama_pemilik: form.nama_pemilik || null,
        keterangan: form.keterangan || null,
      };
      if (editId) await updateCashBank(editId, payload);
      else await createCashBank(payload);
      swalSuccess(editId ? 'Master Kas/Bank diperbarui.' : 'Master Kas/Bank ditambahkan.');
      setModalOpen(false);
      onReload();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan master Kas/Bank.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (cb) => {
    try {
      await toggleCashBankStatus(cb.id);
      swalSuccess(cb.is_active
        ? `${cb.nama_tampilan} dinonaktifkan. Akun COA dan riwayat transaksi tidak berubah.`
        : `${cb.nama_tampilan} diaktifkan kembali.`);
      onReload();
    } catch (err) {
      swalError('Gagal mengubah status', err.response?.data?.message);
    }
  };

  const hapus = async (cb) => {
    const ok = await swalConfirm({
      title: `Hapus master ${cb.nama_tampilan}?`,
      text: 'Master hanya dapat dihapus bila belum ada transaksi POSTED. Akun COA tidak dihapus.',
      confirmText: 'Hapus',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteCashBank(cb.id);
      swalSuccess('Master Kas/Bank dihapus.');
      onReload();
    } catch (err) {
      swalError('Gagal menghapus master', err.response?.data?.message);
    }
  };

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return master;
    return master.filter((c) =>
      (c.nama_tampilan || '').toLowerCase().includes(q)
      || (c.nama_bank || '').toLowerCase().includes(q)
      || (c.kode_akun || '').toLowerCase().includes(q)
      || (c.nama_akun || '').toLowerCase().includes(q));
  }, [master, search]);

  return (
    <div className="space-y-4">
      <div className={`${card} p-4 flex flex-wrap items-end gap-3`}>
        <div className="flex-1 min-w-55">
          <label className={labelClass}>Cari</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Nama kas/bank, nama bank, atau akun COA..."
              className={`${inputClass} pl-9`} />
          </div>
        </div>
        <button onClick={bukaTambah} className={btnPrimary}>
          <Plus className="h-4 w-4" /> Tambah Kas/Bank
        </button>
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">Nama Tampilan</th>
                <th className="px-4 py-3 text-left">Jenis</th>
                <th className="px-4 py-3 text-left">Akun COA</th>
                <th className="px-4 py-3 text-left">Bank / Rekening</th>
                <th className="px-4 py-3 text-right">Saldo Akhir</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Memuat data...</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Belum ada master Kas/Bank. Pastikan akun COA tipe Aset sudah dibuat terlebih dahulu.
                </td></tr>
              )}
              {rows.map((cb) => (
                <tr key={cb.id} className={cb.is_active ? '' : 'opacity-60'}>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{cb.nama_tampilan}</td>
                  <td className="px-4 py-3 text-xs">{cb.jenis}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-mono">{cb.kode_akun}</span> — {cb.nama_akun}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {cb.jenis === 'BANK'
                      ? `${cb.nama_bank || '-'}${cb.rekening_masked ? ` • ${cb.rekening_masked}` : ''}`
                      : 'Kas tunai'}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">{angka(cb.saldo_akhir)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[11px] font-bold px-2 py-1 rounded-full ${cb.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {cb.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 justify-center">
                      <button onClick={() => bukaEdit(cb)} title="Ubah"
                        className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition cursor-pointer">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => toggle(cb)} title={cb.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        className={`p-1.5 rounded-lg transition cursor-pointer ${cb.is_active ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}>
                        <Power className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => hapus(cb)} title="Hapus (bila belum ada transaksi)"
                        className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition cursor-pointer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className={`${card} w-full max-w-2xl max-h-[90vh] overflow-y-auto`}>
            <div className="p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editId ? 'Ubah' : 'Tambah'} Master Kas/Bank</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Satu akun COA hanya dapat dipasangkan ke satu master.
              </p>
            </div>

            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelClass}>Akun COA (Aset, akun detail, aktif) <span className="text-red-500">*</span></label>
                <select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} className={inputClass}>
                  <option value="">— Pilih akun COA —</option>
                  {akunTersedia.length === 0 && <option value="" disabled>Tidak ada akun Aset yang tersedia</option>}
                  {akunTersedia.map((a) => (
                    <option key={a.id} value={a.id}>{a.nomor_akun} — {a.nama_akun}</option>
                  ))}
                </select>
                {akunTersedia.length === 0 && (
                  <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Belum ada akun Aset detail yang aktif &amp; belum terpakai. Buat dulu di Chart of Account.
                    <button onClick={onGoCoa} className="underline font-semibold inline-flex items-center gap-0.5">
                      Buka COA <ExternalLink className="h-3 w-3" />
                    </button>
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Jenis <span className="text-red-500">*</span></label>
                <select value={form.jenis} onChange={(e) => setForm({ ...form, jenis: e.target.value })} className={inputClass}>
                  <option value="KAS">KAS</option>
                  <option value="BANK">BANK</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Nama Tampilan <span className="text-red-500">*</span></label>
                <input value={form.nama_tampilan} onChange={(e) => setForm({ ...form, nama_tampilan: e.target.value })}
                  placeholder="Contoh: Kas Utama / Bank Operasional" className={inputClass} />
              </div>

              {form.jenis === 'BANK' && (
                <>
                  <div>
                    <label className={labelClass}>Nama Bank <span className="text-red-500">*</span></label>
                    <input value={form.nama_bank} onChange={(e) => setForm({ ...form, nama_bank: e.target.value })}
                      placeholder="Contoh: BCA" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Cabang</label>
                    <input value={form.cabang} onChange={(e) => setForm({ ...form, cabang: e.target.value })}
                      placeholder="Contoh: Bekasi" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Nomor Rekening</label>
                    <input value={form.nomor_rekening} onChange={(e) => setForm({ ...form, nomor_rekening: e.target.value })}
                      placeholder="Nomor rekening" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Nama Pemilik Rekening</label>
                    <input value={form.nama_pemilik} onChange={(e) => setForm({ ...form, nama_pemilik: e.target.value })}
                      placeholder="Sesuai buku tabungan" className={inputClass} />
                  </div>
                </>
              )}

              <div className="sm:col-span-2">
                <label className={labelClass}>Keterangan</label>
                <textarea value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  rows={2} className={inputClass} />
              </div>

              <label className="sm:col-span-2 inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Aktif (dapat dipakai transaksi baru)
              </label>

              {error && (
                <div className="sm:col-span-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className={btnGhost}>Batal</button>
              <button onClick={simpan} disabled={saving} className={btnPrimary}>
                <Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════ TAB SALDO AWAL ═════════════════════════════════ */

function TabSaldoAwal({ onChanged, onGoCoa }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ saldo_awal: '', saldo_awal_tanggal: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const muat = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await getCashBankSaldoAwal();
      setData(res);
    } catch (err) {
      swalError('Gagal memuat saldo awal', err.response?.data?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { muat(); }, [muat]);

  const bukaEdit = (row) => {
    setEditId(row.id);
    setForm({
      saldo_awal: row.saldo_awal ? String(row.saldo_awal) : '',
      saldo_awal_tanggal: row.saldo_awal_tanggal || '',
    });
    setError('');
  };

  const simpan = async () => {
    const nominal = Number(form.saldo_awal);
    if (!Number.isFinite(nominal) || nominal < 0) return setError('Saldo awal harus berupa angka dan tidak boleh negatif.');
    if (nominal > 0 && !form.saldo_awal_tanggal) return setError('Tanggal saldo awal wajib diisi karena saldo lebih dari nol.');

    setSaving(true);
    setError('');
    try {
      await simpanCashBankSaldoAwal(editId, {
        saldo_awal: nominal,
        saldo_awal_tanggal: form.saldo_awal_tanggal || null,
      });
      swalSuccess('Saldo awal Kas/Bank tersimpan.');
      setEditId(null);
      await muat();
      onChanged?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal menyimpan saldo awal.');
    } finally {
      setSaving(false);
    }
  };

  const rows = data?.rows || [];

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl px-4 py-3">
        <p className="text-sm font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
          <Info className="h-4 w-4" /> Saldo awal dibaca dari Chart of Account
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
          Nilai disimpan pada akun COA (<code>saldo_awal</code> &amp; <code>saldo_awal_tanggal</code>), bukan pada master Kas/Bank.
          Menu ini tidak membuat jurnal dan tidak menganggap saldo awal sebagai modal.
          Pembukaan akun lain tetap diisi di COA — selama belum lengkap, Neraca Saldo/Neraca keseluruhan mungkin belum seimbang.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Kartu label="Total Saldo Awal Kas & Bank (aktif)" nilai={rupiah(data?.total_saldo_awal)} bold />
        <Kartu label="Akun Aset lain tanpa saldo awal" nilai={String(data?.akun_aset_tanpa_saldo ?? 0)} small />
        <Kartu label="Jumlah Kas/Bank" nilai={String(rows.length)} small />
      </div>

      <div className={`${card} overflow-hidden`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Saldo Awal per Kas/Rekening</h3>
          <button onClick={onGoCoa} className={btnGhost}>
            <ExternalLink className="h-4 w-4" /> Buka COA
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-500 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3 text-left">Kas / Bank</th>
                <th className="px-4 py-3 text-left">Akun COA</th>
                <th className="px-4 py-3 text-right">Saldo Awal</th>
                <th className="px-4 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3 text-center">Keterangan</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Memuat saldo awal...</td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Belum ada master Kas/Bank. Tambahkan master terlebih dahulu.
                </td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                    {r.nama_tampilan}
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">{r.jenis}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                    <span className="font-mono">{r.kode_akun}</span> — {r.nama_akun}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap font-semibold">{angka(r.saldo_awal)}</td>
                  <td className="px-4 py-3 text-xs whitespace-nowrap">{r.saldo_awal_tanggal ? formatTanggal(r.saldo_awal_tanggal) : '-'}</td>
                  <td className="px-4 py-3 text-center text-xs">
                    {r.terkunci
                      ? <span className="text-amber-700 dark:text-amber-400 font-semibold">Terkunci ({r.jumlah_voucher_posted} voucher POSTED)</span>
                      : <span className="text-slate-400">Terkunci setelah ada transaksi</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => bukaEdit(r)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition cursor-pointer text-xs font-semibold">
                      <Pencil className="h-3.5 w-3.5" /> Atur
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editId && (
        <div className={`${card} p-4 space-y-3`}>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Atur Saldo Awal — {rows.find((r) => r.id === editId)?.nama_tampilan}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className={labelClass}>Saldo Awal</label>
              <input type="number" min="0" step="0.01" value={form.saldo_awal}
                onChange={(e) => setForm({ ...form, saldo_awal: e.target.value })}
                placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Tanggal Saldo Awal</label>
              <input type="date" value={form.saldo_awal_tanggal}
                onChange={(e) => setForm({ ...form, saldo_awal_tanggal: e.target.value })}
                max={todayISODate()} className={inputClass} />
            </div>
            <div className="flex gap-2">
              <button onClick={simpan} disabled={saving} className={btnPrimary}>
                <Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button onClick={() => setEditId(null)} className={btnGhost}>Batal</button>
            </div>
          </div>
          {error && (
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Jika akun sudah memiliki voucher POSTED, saldo awal tidak dapat diubah. Gunakan reversal voucher pada Jurnal Umum.
          </p>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════ TAB TRANSAKSI ═════════════════════════════════ */

const MODE_CONFIG = {
  penerimaan: {
    title: 'Penerimaan Kas / Bank',
    icon: ArrowDownLeft,
    tombol: 'Posting Penerimaan',
    akunLabel: 'Akun Lawan (Kredit)',
    pihakLabel: 'Diterima Dari',
    keteranganAkun: 'Jurnal: Debit Kas/Bank tujuan, Kredit akun lawan. Pilih akun sesuai sumber dana (piutang, pendapatan, modal, dll).',
    endpoint: createCashBankPenerimaan,
  },
  pengeluaran: {
    title: 'Pengeluaran Kas / Bank',
    icon: ArrowUpRight,
    tombol: 'Posting Pengeluaran',
    akunLabel: 'Akun Lawan (Debit)',
    pihakLabel: 'Dibayarkan Kepada',
    keteranganAkun: 'Jurnal: Debit akun lawan, Kredit Kas/Bank sumber. Pilih akun sesuai jenis pengeluaran (beban, utang, aset, dll).',
    endpoint: createCashBankPengeluaran,
  },
  transfer: {
    title: 'Transfer Antar Kas / Bank',
    icon: ArrowLeftRight,
    tombol: 'Posting Transfer',
    endpoint: createCashBankTransfer,
  },
};

function TabTransaksi({ mode, master, onChanged, onBukaJurnal }) {
  const cfg = MODE_CONFIG[mode];
  const aktif = useMemo(() => master.filter((m) => m.is_active), [master]);
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({
    tanggal: todayISODate(),
    cash_bank_id: '',
    sumber_id: '',
    tujuan_id: '',
    lawan_account_id: '',
    nominal: '',
    no_referensi: '',
    pihak_terkait: '',
    keterangan: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasil, setHasil] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getAccounts({ status: 'Aktif' });
        setAccounts(data.filter((a) => a.is_active && !a.is_header));
      } catch (err) {
        swalError('Gagal memuat akun COA', err.response?.data?.message);
      }
    })();
  }, []);

  const akunMap = useMemo(
    () => Object.fromEntries(accounts.map((a) => [String(a.id), a])),
    [accounts]
  );

  const bankTerpilih = mode === 'transfer'
    ? aktif.find((m) => String(m.id) === String(form.sumber_id))
    : aktif.find((m) => String(m.id) === String(form.cash_bank_id));

  const validasi = () => {
    if (!form.tanggal) return 'Tanggal wajib diisi.';
    const nominal = Number(form.nominal);
    if (!Number.isFinite(nominal) || nominal <= 0) return 'Nominal harus lebih besar dari nol.';

    if (mode === 'transfer') {
      if (!form.sumber_id) return 'Kas/Bank sumber wajib dipilih.';
      if (!form.tujuan_id) return 'Kas/Bank tujuan wajib dipilih.';
      if (form.sumber_id === form.tujuan_id) return 'Kas/Bank sumber dan tujuan harus berbeda.';
    } else {
      if (!form.cash_bank_id) return `${mode === 'penerimaan' ? 'Kas/Bank tujuan' : 'Kas/Bank sumber'} wajib dipilih.`;
      if (!form.lawan_account_id) return 'Akun lawan wajib dipilih.';
    }
    return '';
  };

  const kirim = async () => {
    const err = validasi();
    if (err) return setError(err);

    setSaving(true);
    setError('');
    setHasil(null);
    try {
      const base = {
        tanggal: form.tanggal,
        nominal: Number(form.nominal),
        no_referensi: form.no_referensi || null,
        keterangan: form.keterangan || null,
      };

      const payload = mode === 'transfer'
        ? { ...base, sumber_id: Number(form.sumber_id), tujuan_id: Number(form.tujuan_id) }
        : {
          ...base,
          cash_bank_id: Number(form.cash_bank_id),
          lawan_account_id: Number(form.lawan_account_id),
          pihak_terkait: form.pihak_terkait || null,
        };

      const { data } = await cfg.endpoint(payload);

      if (data.status === 'POSTED') {
        swalSuccess(data.message);
      } else {
        swalError('Tersimpan sebagai draft', data.message);
      }

      setHasil(data);
      setForm((f) => ({
        ...f,
        nominal: '',
        no_referensi: '',
        pihak_terkait: '',
        keterangan: '',
      }));
      onChanged?.();
    } catch (err2) {
      const body = err2.response?.data || {};
      setError(body.message || 'Gagal menyimpan transaksi.');
      if (body.status === 'DRAFT') setHasil(body);
    } finally {
      setSaving(false);
    }
  };

  const inputNominal = rupiah(Number(form.nominal) || 0);

  return (
    <div className="space-y-4">
      <div className={`${card} p-5 space-y-4`}>
        <div className="flex items-center gap-2">
          <cfg.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{cfg.title}</h3>
        </div>

        {aktif.length === 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-xl px-4 py-3">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Belum ada Kas/Bank aktif. Tambahkan master pada tab “Daftar Kas &amp; Rekening Bank” terlebih dahulu.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Tanggal <span className="text-red-500">*</span></label>
            <input type="date" value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className={inputClass} />
          </div>

          {mode === 'transfer' ? (
            <>
              <div>
                <label className={labelClass}>Kas/Bank Sumber <span className="text-red-500">*</span></label>
                <select value={form.sumber_id} onChange={(e) => setForm({ ...form, sumber_id: e.target.value })} className={inputClass}>
                  <option value="">— Pilih sumber —</option>
                  {aktif.map((m) => <option key={m.id} value={m.id}>{m.nama_tampilan} ({m.kode_akun})</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Kas/Bank Tujuan <span className="text-red-500">*</span></label>
                <select value={form.tujuan_id} onChange={(e) => setForm({ ...form, tujuan_id: e.target.value })} className={inputClass}>
                  <option value="">— Pilih tujuan —</option>
                  {aktif.filter((m) => String(m.id) !== String(form.sumber_id))
                    .map((m) => <option key={m.id} value={m.id}>{m.nama_tampilan} ({m.kode_akun})</option>)}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelClass}>
                  {mode === 'penerimaan' ? 'Kas/Bank Tujuan' : 'Kas/Bank Sumber'} <span className="text-red-500">*</span>
                </label>
                <select value={form.cash_bank_id} onChange={(e) => setForm({ ...form, cash_bank_id: e.target.value })} className={inputClass}>
                  <option value="">— Pilih kas/bank —</option>
                  {aktif.map((m) => <option key={m.id} value={m.id}>{m.nama_tampilan} ({m.kode_akun})</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>{cfg.pihakLabel}</label>
                <input value={form.pihak_terkait} onChange={(e) => setForm({ ...form, pihak_terkait: e.target.value })}
                  placeholder="Nama pihak" className={inputClass} />
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {mode !== 'transfer' && (
            <div className="sm:col-span-2">
              <label className={labelClass}>{cfg.akunLabel} <span className="text-red-500">*</span></label>
              <select value={form.lawan_account_id}
                onChange={(e) => setForm({ ...form, lawan_account_id: e.target.value })} className={inputClass}>
                <option value="">— Pilih akun COA —</option>
                {accounts
                  .filter((a) => String(a.id) !== String(bankTerpilih?.account_id))
                  .map((a) => (
                    <option key={a.id} value={a.id}>{a.nomor_akun} — {a.nama_akun} ({a.tipe_akun})</option>
                  ))}
              </select>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{cfg.keteranganAkun}</p>
            </div>
          )}

          <div>
            <label className={labelClass}>Nominal <span className="text-red-500">*</span></label>
            <input type="number" min="0" step="0.01" value={form.nominal}
              onChange={(e) => setForm({ ...form, nominal: e.target.value })}
              placeholder="0" className={`${inputClass} text-right`} />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{inputNominal}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Nomor Referensi</label>
            <input value={form.no_referensi} onChange={(e) => setForm({ ...form, no_referensi: e.target.value })}
              placeholder="Opsional" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Keterangan</label>
            <input value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              placeholder="Uraian transaksi" className={inputClass} />
          </div>
        </div>

        {bankTerpilih && (
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
            Akun kas/bank terpilih: <strong>{bankTerpilih.kode_akun} — {bankTerpilih.nama_akun}</strong>
            {mode !== 'transfer' && (
              <> · Saldo akhir saat ini {rupiah(bankTerpilih.saldo_akhir)}</>
            )}
            {mode !== 'transfer' && form.lawan_account_id && akunMap[form.lawan_account_id] && (
              <> · Akun lawan: <strong>{akunMap[form.lawan_account_id].nomor_akun} — {akunMap[form.lawan_account_id].nama_akun}</strong></>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">{error}</p>
            {hasil?.no_voucher && (
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                Voucher <strong>{hasil.no_voucher}</strong> tersimpan sebagai DRAFT dan belum memengaruhi laporan.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={kirim} disabled={saving || aktif.length === 0} className={btnPrimary}>
            <Save className="h-4 w-4" /> {saving ? 'Memproses...' : cfg.tombol}
          </button>
          {(hasil?.status === 'DRAFT' || hasil?.no_voucher) && (
            <button onClick={onBukaJurnal} className={btnGhost}>
              <ExternalLink className="h-4 w-4" /> Lanjutkan di Jurnal Umum
            </button>
          )}
        </div>
      </div>

      {hasil && (
        <div className={`${card} p-4`}>
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
            Hasil Transaksi — {hasil.status === 'POSTED' ? 'POSTED' : 'DRAFT'}
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-300">{hasil.message}</p>
          {hasil.voucher && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300">
                  <tr>
                    <th className="px-3 py-2 text-left">No. Voucher</th>
                    <th className="px-3 py-2 text-left">Tanggal</th>
                    <th className="px-3 py-2 text-left">Jenis</th>
                    <th className="px-3 py-2 text-left">Akun</th>
                    <th className="px-3 py-2 text-right">Debit</th>
                    <th className="px-3 py-2 text-right">Kredit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(hasil.voucher.lines || []).map((l, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-mono">{i === 0 ? hasil.voucher.no_voucher : ''}</td>
                      <td className="px-3 py-2">{i === 0 ? formatTanggal(hasil.voucher.tanggal) : ''}</td>
                      <td className="px-3 py-2">{i === 0 ? hasil.voucher.jenis : ''}</td>
                      <td className="px-3 py-2">{l.nomor_akun} — {l.nama_akun}</td>
                      <td className="px-3 py-2 text-right">{l.debit ? angka(l.debit) : '-'}</td>
                      <td className="px-3 py-2 text-right">{l.kredit ? angka(l.kredit) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl px-4 py-3">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          Setiap transaksi dicatat sebagai <strong>Journal Voucher</strong> dan langsung diposting.
          Voucher yang sudah POSTED tidak dapat diedit/dihapus — koreksi dilakukan lewat reversal di Jurnal Umum.
        </p>
      </div>
    </div>
  );
}

/* ═════════════════════════════════ TAB MUTASI ═════════════════════════════════ */

function TabMutasi({ master, periode, setPeriode, onBukaJurnal }) {
  const [cashBankId, setCashBankId] = useState('');
  const [jenis, setJenis] = useState('Semua');
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cashBankId && master.length) setCashBankId(String(master[0].id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [master]);

  const muat = useCallback(async () => {
    if (!cashBankId) return;
    setLoading(true);
    try {
      const { data: res } = await getCashBankMutasi({
        cash_bank_id: cashBankId,
        from: periode.from,
        to: periode.to,
        jenis: jenis === 'Semua' ? undefined : jenis,
        search: search.trim() || undefined,
      });
      setData(res);
    } catch (err) {
      swalError('Gagal memuat mutasi', err.response?.data?.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [cashBankId, periode, jenis, search]);

  useEffect(() => { muat(); }, [muat]);

  return (
    <div className="space-y-4">
      <div className={`${card} p-4 flex flex-wrap items-end gap-3`}>
        <div className="min-w-60">
          <label className={labelClass}>Kas / Bank</label>
          <select value={cashBankId} onChange={(e) => setCashBankId(e.target.value)} className={inputClass}>
            {master.length === 0 && <option value="">Belum ada master</option>}
            {master.map((m) => <option key={m.id} value={m.id}>{m.nama_tampilan} ({m.kode_akun})</option>)}
          </select>
        </div>
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
        <div>
          <label className={labelClass}>Jenis Transaksi</label>
          <select value={jenis} onChange={(e) => setJenis(e.target.value)} className={inputClass}>
            <option value="Semua">Semua</option>
            {VOUCHER_TYPES.map((j) => <option key={j}>{j}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-45">
          <label className={labelClass}>Cari</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="No. voucher, keterangan, referensi..." className={`${inputClass} pl-9`} />
          </div>
        </div>
        <button onClick={muat} className={btnGhost}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Muat
        </button>
        <button onClick={() => printKasBankMutasi(data, { ...periode, jenis, search: search.trim() })}
          disabled={!data} className={btnNeutral}>
          <Printer className="h-4 w-4" /> Cetak Mutasi
        </button>
      </div>

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Kartu label="Saldo Awal Periode" nilai={rupiah(data.saldo_awal_periode)} />
          <Kartu label="Total Debit (masuk)" nilai={rupiah(data.total_debit)} tone="emerald" />
          <Kartu label="Total Kredit (keluar)" nilai={rupiah(data.total_kredit)} tone="rose" />
          <Kartu label="Saldo Akhir" nilai={rupiah(data.saldo_akhir)} bold />
        </div>
      )}

      <div className={`${card} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-300 uppercase">
              <tr>
                <th className="px-3 py-3 text-left">Tanggal</th>
                <th className="px-3 py-3 text-left">No. Voucher</th>
                <th className="px-3 py-3 text-left">Jenis</th>
                <th className="px-3 py-3 text-left">Keterangan</th>
                <th className="px-3 py-3 text-left">Referensi</th>
                <th className="px-3 py-3 text-right">Debit</th>
                <th className="px-3 py-3 text-right">Kredit</th>
                <th className="px-3 py-3 text-right">Saldo</th>
                <th className="px-3 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">Memuat mutasi...</td></tr>}
              {!loading && (data?.rows?.length ?? 0) === 0 && (
                <tr><td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                  Tidak ada mutasi pada periode/filter ini.
                </td></tr>
              )}
              {(data?.rows || []).map((r, i) => (
                <tr key={`${r.line_id}-${i}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 whitespace-nowrap">{formatTanggal(r.tanggal)}</td>
                  <td className="px-3 py-2 font-mono whitespace-nowrap">{r.no_voucher}</td>
                  <td className="px-3 py-2">{r.jenis}</td>
                  <td className="px-3 py-2">{r.keterangan || '-'}</td>
                  <td className="px-3 py-2">{r.no_referensi || '-'}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{r.debit ? angka(r.debit) : ''}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{r.kredit ? angka(r.kredit) : ''}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap font-semibold">{angka(r.saldo_running)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            {(data?.rows?.length ?? 0) > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800/60 border-t-2 border-slate-300 dark:border-slate-700 font-bold">
                <tr>
                  <td colSpan={5} className="px-3 py-3 text-right">TOTAL</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">{angka(data.total_debit)}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">{angka(data.total_kredit)}</td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">{angka(data.saldo_akhir)}</td>
                  <td className="px-3 py-3"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400">
        Saldo berjalan dihitung dari saldo awal akun COA + saldo sebelum periode + baris jurnal POSTED
        (urut tanggal, nomor voucher, urutan baris). Voucher DRAFT/VOID tidak dihitung.{' '}
        <button onClick={onBukaJurnal} className="underline font-semibold">Buka Jurnal Umum</button>
      </p>
    </div>
  );
}
