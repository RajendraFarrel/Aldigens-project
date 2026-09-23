import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Edit2, Trash2, Barcode, X, Save, RefreshCw, Package, Printer, Upload, FileSpreadsheet } from 'lucide-react';
import { getProducts, createProduct, updateProduct, deleteProduct, importProducts, downloadProductTemplate } from '../services/api';
import BarcodeLabel, { printBarcodes } from '../components/BarcodeLabel';
import { swalConfirm, swalError, swalToast } from '../utils/swal';

const EMPTY_FORM = {
  product_code: '',
  part_number: '',
  name: '',
  category: '',
  unit: 'Unit',
  stock: 0,
};

export default function InventoryProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [barcodeProduct, setBarcodeProduct] = useState(null);

  // State Import Excel
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getProducts(search);
      setProducts(res.data.data || []);
    } catch (e) {
      setError('Gagal memuat data produk.');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchProducts(), 400);
    return () => clearTimeout(timeout);
  }, [fetchProducts]);

  const openAdd = () => {
    setEditingProduct(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditingProduct(product);
    setForm({
      product_code: product.product_code || '',
      part_number: product.part_number || '',
      name: product.name || '',
      category: product.category || '',
      unit: product.unit || 'Unit',
      stock: product.stock ?? 0,
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Nama produk wajib diisi.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, form);
        swalToast('Produk berhasil diperbarui.', 'success');
      } else {
        await createProduct(form);
        swalToast('Produk berhasil ditambahkan.', 'success');
      }
      setShowModal(false);
      fetchProducts();
    } catch (e) {
      setError(e.response?.data?.message || 'Terjadi kesalahan, coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrintBarcode = (product) => {
    printBarcodes([product]);
  };

  const openImport = () => {
    setImportFile(null);
    setImportResult(null);
    setError('');
    setShowImport(true);
  };

  const handleImport = async () => {
    if (!importFile) {
      setError('Pilih file Excel terlebih dahulu.');
      return;
    }
    setImporting(true);
    setError('');
    setImportResult(null);
    try {
      const res = await importProducts(importFile);
      setImportResult(res.data);
      swalToast(`Import selesai: ${res.data.imported} produk masuk.`, 'success');
      fetchProducts();
    } catch (e) {
      setError(e.response?.data?.message || 'Gagal mengimpor file.');
    } finally {
      setImporting(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await downloadProductTemplate();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template-import-produk.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      swalToast('Template berhasil diunduh.', 'success');
    } catch (e) {
      swalError('Gagal mengunduh', 'Tidak dapat mengunduh template import.');
    }
  };

  const handleDelete = async (product) => {
    const ok = await swalConfirm({
      title: 'Hapus Produk?',
      text: `Produk "${product.name}" akan dihapus. Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      danger: true,
    });
    if (!ok) return;
    try {
      await deleteProduct(product.id);
      swalToast('Produk berhasil dihapus.', 'success');
      fetchProducts();
    } catch (e) {
      swalError('Gagal menghapus', 'Terjadi kesalahan saat menghapus produk.');
    }
  };

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-xl shadow">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Data Produk</h2>
            <p className="text-xs text-slate-500">Manajemen produk & stok inventory</p>
          </div>
        </div>
        <button
          onClick={openImport}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition shadow cursor-pointer"
        >
          <Upload className="h-4 w-4" />
          Import Excel
        </button>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition shadow cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Tambah Produk
        </button>
      </div>

      {/* Alert messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <span>✗</span> {error}
        </div>
      )}

      {/* Search & Refresh */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari produk (nama, kode, barcode, part number)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
        <button
          onClick={fetchProducts}
          className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-100 transition text-slate-600 cursor-pointer"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Kode Produk</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Part Number</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nama Produk</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Kategori</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Satuan</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Stok</th>
                <th className="text-center px-4 py-3 font-semibold text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin inline mr-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Tidak ada produk ditemukan.
                  </td>
                </tr>
              ) : products.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg">
                      {p.product_code}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{p.part_number || '-'}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.category || '-'}</td>
                  <td className="px-4 py-3 text-slate-500">{p.unit}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-bold text-base ${p.stock <= 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => setBarcodeProduct(p)}
                        className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50 transition cursor-pointer"
                        title="Lihat Barcode"
                      >
                        <Barcode className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 border-t border-slate-100 text-xs text-slate-400">
          Total: {products.length} produk
        </div>
      </div>

      {/* Modal Tambah/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Kode Produk <span className="text-slate-400 font-normal">(kosongkan untuk auto-generate)</span></label>
                <input
                  type="text"
                  value={form.product_code}
                  onChange={(e) => setForm({ ...form, product_code: e.target.value })}
                  placeholder="Contoh: ALG-001 (kosong = auto INT-XXXX)"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Part Number</label>
                <input
                  type="text"
                  value={form.part_number}
                  onChange={(e) => setForm({ ...form, part_number: e.target.value })}
                  placeholder="Part number dari supplier"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Nama Produk <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama produk/barang"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Kategori</label>
                  <input
                    type="text"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Sparepart, Alat, dll"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Satuan</label>
                  <select
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option>Unit</option>
                    <option>PCS</option>
                    <option>SET</option>
                    <option>ROLL</option>
                    <option>METER</option>
                    <option>KG</option>
                    <option>LITER</option>
                    <option>BOX</option>
                    <option>LUSIN</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Stok Awal</label>
                <input
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: parseInt(e.target.value) || 0 })}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
              >
                {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Barcode */}
      {barcodeProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setBarcodeProduct(null)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Barcode className="h-5 w-5 text-violet-600" />
                Barcode Produk
              </h3>
              <button onClick={() => setBarcodeProduct(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="text-center space-y-1">
              <p className="font-semibold text-slate-800">{barcodeProduct.name}</p>
              {barcodeProduct.part_number && (
                <p className="text-xs text-slate-500">Part No: {barcodeProduct.part_number}</p>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-center overflow-x-auto">
              <BarcodeLabel
                value={barcodeProduct.barcode || barcodeProduct.product_code}
                height={70}
                width={2}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setBarcodeProduct(null)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={() => { handlePrintBarcode(barcodeProduct); }}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Cetak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import Excel */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                Import Data Produk
              </h3>
              <button onClick={() => setShowImport(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs px-3 py-2.5 rounded-xl leading-relaxed">
              Kolom yang dibaca: <b>Part Number, Nama Barang, Jenis Barang, Satuan, Stock Awal</b>.
              Kolom <b>Kode Produk tidak perlu ada</b> — dibuat otomatis (INT-XXXX).
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="w-full flex items-center justify-center gap-2 bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-sm font-medium px-4 py-2.5 rounded-xl transition cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Download Template Excel
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Pilih File (.xlsx / .xls / .csv)</label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => { setImportFile(e.target.files[0] || null); setImportResult(null); }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white file:text-xs file:font-medium cursor-pointer"
              />
            </div>

            {importResult && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Berhasil diimpor</span>
                  <span className="font-bold text-emerald-600">{importResult.imported}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dilewati</span>
                  <span className="font-bold text-amber-600">{importResult.skipped}</span>
                </div>
                {importResult.errors && importResult.errors.length > 0 && (
                  <div className="pt-1 border-t border-slate-200 max-h-32 overflow-y-auto">
                    <p className="text-[11px] font-semibold text-slate-500 mb-1">Catatan:</p>
                    {importResult.errors.map((msg, i) => (
                      <p key={i} className="text-[11px] text-slate-500">{msg}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowImport(false)}
                className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !importFile}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
              >
                {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {importing ? 'Mengimpor...' : 'Mulai Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
