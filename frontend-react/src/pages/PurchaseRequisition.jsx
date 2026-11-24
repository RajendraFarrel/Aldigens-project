import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, Plus, MoreVertical, ArrowLeft, Save, Edit3, Trash2,
  Printer, FileText, CheckCircle2, Clock, ShoppingCart,
} from 'lucide-react';
import Select from 'react-select';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import { getProducts } from '../services/api';
import { swalToast } from '../utils/swal';

const PR_STORAGE_KEY = 'aldigens_purchase_requisitions';
const PR_QUEUE_KEY = 'aldigens_pr_draft_queue';

const generatePrNo = () =>
  'PR-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);

export default function PurchaseRequisition() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);

  useEffect(() => {
    let active = true;
    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const res = await getProducts('');
        const rows = res.data?.data || res.data || [];
        if (active) setInventoryItems(Array.isArray(rows) ? rows : []);
      } catch (err) {
        console.error('Gagal memuat daftar barang inventory:', err);
        if (active) setInventoryItems([]);
      } finally {
        if (active) setLoadingProducts(false);
      }
    };
    loadProducts();
    return () => {
      active = false;
    };
  }, []);

  const productOptions = useMemo(
    () =>
      inventoryItems.map((inv) => {
        const code = inv.part_number || inv.product_code || inv.barcode;
        const name = inv.name || inv.description || '';
        return {
          value: inv.id,
          code,
          name,
          unit: inv.unit || 'PCS',
          label: name ? `${code} — ${name}` : code,
          raw: inv,
        };
      }),
    [inventoryItems]
  );

  const [viewMode, setViewMode] = useState('list');
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const rowSeq = useRef(0);

  const [prList, setPrList] = useState(() => {
    try {
      const saved = localStorage.getItem(PR_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // abaikan
    }
    return [];
  });

  const persistPRs = (nextList) => {
    setPrList(nextList);
    localStorage.setItem(PR_STORAGE_KEY, JSON.stringify(nextList));
  };

  const [formData, setFormData] = useState({
    prNo: generatePrNo(),
    date: new Date().toISOString().split('T')[0],
    department: 'Inventory & Gudang',
    requester: 'Administrator',
    remarks: '',
    status: 'Menunggu',
    items: [{ id: Date.now(), productId: null, partNumber: '', quantity: 1, unit: 'PCS' }],
  });

  // Tangkap antrean PR otomatis saat dibuka dari Dashboard / Inventory
  useEffect(() => {
    const rawQueue = localStorage.getItem(PR_QUEUE_KEY);
    if (!rawQueue) return;

    try {
      const parsed = JSON.parse(rawQueue);
      localStorage.removeItem(PR_QUEUE_KEY);

      if (parsed?.items?.length) {
        const mappedItems = parsed.items.map((it, idx) => {
          const code = it.part_number || '';
          const name = it.name || '';
          return {
            id: Date.now() + idx,
            productId: it.productId || null,
            partNumber: name ? `${code} — ${name}` : code,
            quantity: Number(it.quantity || 1),
            unit: it.unit || 'PCS',
          };
        });

        setEditingId(null);
        setFormData({
          prNo: generatePrNo(),
          date: new Date().toISOString().split('T')[0],
          department: parsed.department || 'Inventory & Gudang',
          requester: 'Administrator Gudang',
          remarks: parsed.remarks || '',
          status: 'Menunggu',
          items: mappedItems,
        });
        setViewMode('form');
      }
    } catch {
      localStorage.removeItem(PR_QUEUE_KEY);
    }
  }, []);

  const filteredPRs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return prList;
    return prList.filter(
      (item) =>
        String(item.prNo || '').toLowerCase().includes(q) ||
        String(item.department || '').toLowerCase().includes(q) ||
        String(item.requester || '').toLowerCase().includes(q)
    );
  }, [prList, searchTerm]);

  const pagination = usePagination(filteredPRs, 10);

  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormData({
      prNo: generatePrNo(),
      date: new Date().toISOString().split('T')[0],
      department: 'Inventory & Gudang',
      requester: 'Administrator',
      remarks: '',
      status: 'Menunggu',
      items: [{ id: Date.now(), productId: null, partNumber: '', quantity: 1, unit: 'PCS' }],
    });
    setViewMode('form');
  };

  const handleOpenEditForm = (item) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setViewMode('form');
    setActiveMenuId(null);
  };

  const nextRowId = () => Date.now() + rowSeq.current++;

  const handleAddItemRow = () => {
    setFormData((prevForm) => ({
      ...prevForm,
      items: [...prevForm.items, { id: nextRowId(), productId: null, partNumber: '', quantity: 1, unit: 'PCS' }],
    }));
  };

  const handleRemoveItemRow = (id) => {
    if (formData.items.length === 1) {
      alert('Permintaan minimal harus memiliki 1 item barang!');
      return;
    }
    setFormData((prevForm) => ({
      ...prevForm,
      items: prevForm.items.filter((i) => i.id !== id),
    }));
  };

  const handleItemChange = (id, field, value) => {
    setFormData((prevForm) => ({
      ...prevForm,
      items: prevForm.items.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    }));
  };

  const handleProductSelect = (id, option) => {
    setFormData({
      ...formData,
      items: formData.items.map((i) =>
        i.id === id
          ? {
              ...i,
              productId: option ? option.value : null,
              partNumber: option ? option.label : '',
              unit: option ? option.unit || option.raw?.unit || i.unit : i.unit,
            }
          : i
      ),
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.department.trim()) {
      alert('Departemen wajib diisi!');
      return;
    }

    const belumDipilih = formData.items.find((i) => !i.productId && !i.partNumber);
    if (belumDipilih) {
      alert('Setiap item harus dipilih dari daftar inventory.');
      return;
    }

    if (editingId) {
      persistPRs(prList.map((item) => (item.id === editingId ? { ...item, ...formData } : item)));
    } else {
      persistPRs([{ id: Date.now(), ...formData }, ...prList]);
    }
    if (typeof swalToast === 'function') {
      swalToast(`Purchase Requisition ${formData.prNo} berhasil disimpan!`, 'success');
    }
    setViewMode('list');
  };

  const handleApprovePR = (prItem) => {
    const updated = prList.map((item) => (item.id === prItem.id ? { ...item, status: 'Disetujui' } : item));
    persistPRs(updated);
    setActiveMenuId(null);
    if (typeof swalToast === 'function') {
      swalToast(`PR ${prItem.prNo} disetujui dan siap diproses ke PO!`, 'success');
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus Permintaan Pembelian ini?')) {
      persistPRs(prList.filter((item) => item.id !== id));
      setActiveMenuId(null);
    }
  };

  const handleConvertToPO = (prItem) => {
    setActiveMenuId(null);
    const poItems = prItem.items.map((i) => {
      const [code, ...rest] = String(i.partNumber || '').split(' — ');
      return {
        part_number: code.trim(),
        description: rest.join(' — ').trim() || i.partNumber,
        qty: i.quantity,
        unit: i.unit || 'PCS',
        unit_price: 0,
      };
    });

    const newPO = {
      id: Date.now(),
      po_number: 'PO-' + prItem.prNo.replace('PR-', ''),
      date: new Date().toISOString().split('T')[0],
      supplier_name: 'Supplier Umum (' + prItem.department + ')',
      supplier_address: 'Jakarta',
      subject: prItem.remarks || 'Pengadaan dari ' + prItem.prNo,
      items: poItems,
      status: 'Pending',
    };

    const existingPOs = JSON.parse(localStorage.getItem('aldigens_purchase_orders') || '[]');
    localStorage.setItem('aldigens_purchase_orders', JSON.stringify([newPO, ...existingPOs]));

    if (typeof swalToast === 'function') {
      swalToast(`PR ${prItem.prNo} berhasil diproses menjadi ${newPO.po_number}!`, 'success');
    } else {
      alert(`PR ${prItem.prNo} berhasil diproses menjadi Purchase Order (PO)!`);
    }
  };

  const handlePrint = (item) => {
    setActiveMenuId(null);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>PR - ${item.prNo}</title><style>body{font-family:Arial;padding:20px} table{width:100%;border-collapse:collapse;margin-top:15px} th,td{padding:8px;border:1px solid #ddd;text-align:left}</style></head>
      <body>
        <h2>PT. ALDIGENS PUTERA PERSADA</h2>
        <h3>FORM PERMINTAAN PEMBELIAN (PURCHASE REQUISITION)</h3>
        <p><strong>No. PR:</strong> ${item.prNo}</p>
        <p><strong>Tanggal:</strong> ${item.date} | <strong>Departemen:</strong> ${item.department} | <strong>Pemohon:</strong> ${item.requester}</p>
        <p><strong>Keterangan:</strong> ${item.remarks || '-'}</p>
        <h4>Daftar Item Diminta:</h4>
        <table>
          <thead><tr><th>No</th><th>Part Number / Nama Barang</th><th>Kuantitas</th><th>Satuan</th></tr></thead>
          <tbody>
            ${item.items.map((i, idx) => `<tr><td>${idx + 1}</td><td>${i.partNumber}</td><td>${i.quantity}</td><td>${i.unit}</td></tr>`).join('')}
          </tbody>
        </table>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (viewMode === 'form') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 p-8">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-800 rounded-xl transition cursor-pointer">
                <ArrowLeft className="h-5 w-5 text-slate-400" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingId ? 'Edit Permintaan Pembelian (PR)' : 'Buat Permintaan Pembelian Baru'}
                </h2>
                <p className="text-xs text-slate-400">Formulir pengajuan kebutuhan barang dan material perusahaan</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-blue-500/15 border border-blue-500/30 text-blue-400 rounded-full text-xs font-mono font-bold">
              {formData.prNo}
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950 p-5 rounded-xl border border-slate-800">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">No. PR</label>
                <input type="text" value={formData.prNo} disabled className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono font-bold text-slate-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Tanggal Permintaan</label>
                <input required type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Departemen</label>
                <input required type="text" placeholder="Contoh: Inventory & Gudang" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Pemohon (Requester)</label>
                <input required type="text" placeholder="Nama pemohon..." value={formData.requester} onChange={(e) => setFormData({ ...formData, requester: e.target.value })} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="Menunggu">Menunggu (Pending)</option>
                  <option value="Disetujui">Disetujui (Approved)</option>
                </select>
              </div>
              <div className="md:col-span-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Keterangan / Catatan</label>
                <textarea rows="2" placeholder="Catatan atau alasan permintaan..." value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white outline-none focus:ring-2 focus:ring-blue-500"></textarea>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-400" /> Daftar Item yang Diminta
                </h3>
                <button type="button" onClick={handleAddItemRow} className="flex items-center gap-1.5 text-xs bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 font-semibold px-3 py-1.5 rounded-lg transition cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> Tambah Baris Item
                </button>
              </div>

              <div className="border border-slate-800 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">#</th>
                      <th className="px-4 py-3">Part Number / Nama Barang</th>
                      <th className="px-4 py-3 w-36">Kuantitas</th>
                      <th className="px-4 py-3 w-32">Satuan</th>
                      <th className="px-4 py-3 w-16 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900">
                    {formData.items.map((item, index) => {
                      const matchedOption =
                        productOptions.find((o) => String(o.value) === String(item.productId)) ||
                        (item.partNumber
                          ? { value: item.productId || item.partNumber, label: item.partNumber, unit: item.unit }
                          : null);

                      return (
                        <tr key={item.id} className="hover:bg-slate-800/30">
                          <td className="px-4 py-3 text-center text-slate-400 font-medium text-xs">{index + 1}</td>
                          <td className="px-4 py-3">
                            <Select
                              inputId={`pr-item-product-${item.id}`}
                              classNamePrefix="pr-select"
                              className="react-select-container text-sm"
                              placeholder="Ketik Part Number / Nama Barang..."
                              isClearable
                              isSearchable
                              isLoading={loadingProducts}
                              options={productOptions}
                              value={matchedOption}
                              onChange={(option) => handleProductSelect(item.id, option)}
                              noOptionsMessage={() => 'Barang tidak ditemukan di inventory'}
                              loadingMessage={() => 'Memuat daftar barang...'}
                              menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                              styles={{
                                control: (provided, state) => ({
                                  ...provided,
                                  backgroundColor: '#020617',
                                  borderColor: state.isFocused ? '#3b82f6' : '#1e293b',
                                  color: '#ffffff',
                                  borderRadius: '0.5rem',
                                  padding: '2px',
                                  boxShadow: 'none',
                                }),
                                menu: (provided) => ({
                                  ...provided,
                                  backgroundColor: '#0f172a',
                                  borderRadius: '0.5rem',
                                  border: '1px solid #334155',
                                  zIndex: 9999,
                                }),
                                option: (provided, state) => ({
                                  ...provided,
                                  backgroundColor: state.isSelected ? '#2563eb' : state.isFocused ? '#1e293b' : '#0f172a',
                                  color: '#ffffff',
                                  cursor: 'pointer',
                                }),
                                singleValue: (provided) => ({ ...provided, color: '#ffffff' }),
                                input: (provided) => ({ ...provided, color: '#ffffff' }),
                                placeholder: (provided) => ({ ...provided, color: '#94a3b8' }),
                                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                              }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input required type="number" min="1" value={item.quantity} onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))} className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-white" />
                          </td>
                          <td className="px-4 py-3">
                            <select value={item.unit} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)} className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-white">
                              <option value="PCS">PCS</option>
                              <option value="Unit">Unit</option>
                              <option value="Batang">Batang</option>
                              <option value="Kg">Kg</option>
                              <option value="Set">Set</option>
                              <option value="Meter">Meter</option>
                              <option value="ROLL">ROLL</option>
                              <option value="BOX">BOX</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button type="button" onClick={() => handleRemoveItemRow(item.id)} className="p-1.5 hover:bg-rose-500/20 text-rose-400 rounded-lg transition cursor-pointer" title="Hapus Baris">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-800">
              <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2.5 text-slate-300 hover:bg-slate-800 rounded-xl font-medium transition cursor-pointer">Batal</button>
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-600/25 transition cursor-pointer">
                <Save className="h-4 w-4" /> Simpan Permintaan (PR)
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari no. PR atau departemen..."
              className="pl-10 pr-4 py-2.5 w-full sm:w-80 bg-slate-950 border border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button onClick={handleOpenAddForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-600/25 transition cursor-pointer">
            <Plus className="h-4 w-4" />
            Buat PR Baru
          </button>
        </div>

        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3.5">Tanggal</th>
                <th className="px-6 py-3.5">No. PR</th>
                <th className="px-6 py-3.5">Departemen</th>
                <th className="px-6 py-3.5">Pemohon</th>
                <th className="px-6 py-3.5">Item</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {pagination.paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                    Tidak ada data Permintaan Pembelian (PR) ditemukan.
                  </td>
                </tr>
              ) : (
                pagination.paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition relative">
                    <td className="px-6 py-4">{item.date}</td>
                    <td className="px-6 py-4 font-mono font-bold text-blue-400">{item.prNo}</td>
                    <td className="px-6 py-4 font-semibold text-white">{item.department}</td>
                    <td className="px-6 py-4">{item.requester}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{item.items?.length || 0} item</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-max ${
                          item.status === 'Disetujui'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {item.status === 'Disetujui' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center relative">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                        className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                      >
                        <MoreVertical className="h-4 w-4 inline" />
                      </button>

                      {activeMenuId === item.id && (
                        <div className="absolute right-12 top-10 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1.5 z-20 text-left">
                          {item.status !== 'Disetujui' && (
                            <button
                              onClick={() => handleApprovePR(item)}
                              className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-emerald-500/15 text-emerald-300 border-b border-slate-700 cursor-pointer"
                            >
                              <CheckCircle2 className="h-4 w-4" /> Setujui PR
                            </button>
                          )}
                          {item.status === 'Disetujui' && (
                            <button
                              onClick={() => handleConvertToPO(item)}
                              className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-indigo-500/20 text-indigo-300 border-b border-slate-700 cursor-pointer"
                            >
                              <ShoppingCart className="h-4 w-4" /> Proses ke PO
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditForm(item)}
                            className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-slate-700 text-slate-200 cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4 text-blue-400" /> Edit PR
                          </button>
                          <button
                            onClick={() => handlePrint(item)}
                            className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-slate-700 text-slate-200 cursor-pointer"
                          >
                            <Printer className="h-4 w-4 text-emerald-400" /> Cetak Dokumen
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-rose-500/20 text-rose-400 border-t border-slate-700 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" /> Hapus PR
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={pagination.currentPage}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSize}
        />
      </div>
    </div>
  );
}