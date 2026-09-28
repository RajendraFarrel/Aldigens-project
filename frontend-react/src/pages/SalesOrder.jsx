import React, { useState } from 'react';
import { Search, Plus, MoreVertical, ArrowLeft, Save, Edit3, Trash2, Printer, ShoppingCart, CheckCircle2 } from 'lucide-react';

export default function SalesOrder() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' atau 'form'
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);

  // Data Dummy Sales Order (SO)
  const [dummySOs, setDummySOs] = useState([
    {
      id: 1,
      soNo: 'SO-26090021',
      date: '2026-09-28',
      customer: 'PT. UNITED TRACTORS Tbk',
      shipTo: 'Jl. Raya Bekasi Km 22 Cakung, Jakarta Timur',
      refPo: '990621159',
      terms: 'Net 30',
      estDate: '2026-09-21',
      sentBy: 'B 1234 SZT',
      salesman: 'FIKHAY',
      status: 'Disetujui',
      items: [
        { id: 101, code: 'OPT-PRTR-KCMS-P400', name: 'HANDRAIL PC400', qty: 1, unit: 'PCS', price: 1500000, disc: 0, tax: 11 }
      ]
    }
  ]);

  // State Form Input
  const [formData, setFormData] = useState({
    soNo: 'SO-' + Math.floor(10000000 + Math.random() * 90000000),
    date: new Date().toISOString().split('T')[0],
    customer: '',
    shipTo: '',
    refPo: '',
    terms: 'Net 30',
    estDate: new Date().toISOString().split('T')[0],
    sentBy: 'Kurir Perusahaan',
    salesman: 'Administrator',
    status: 'Disetujui',
    items: [{ id: Date.now(), code: '', name: '', qty: 1, unit: 'PCS', price: 0, disc: 0, tax: 11 }]
  });

  const handleOpenAddForm = () => {
    setEditingId(null);
    setFormData({
      soNo: 'SO-' + Math.floor(10000000 + Math.random() * 90000000),
      date: new Date().toISOString().split('T')[0],
      customer: '',
      shipTo: '',
      refPo: '',
      terms: 'Net 30',
      estDate: new Date().toISOString().split('T')[0],
      sentBy: 'Kurir Perusahaan',
      salesman: 'Administrator',
      status: 'Disetujui',
      items: [{ id: Date.now(), code: '', name: '', qty: 1, unit: 'PCS', price: 0, disc: 0, tax: 11 }]
    });
    setViewMode('form');
  };

  const handleOpenEditForm = (item) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setViewMode('form');
    setActiveMenuId(null);
  };

  const handleAddItemRow = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { id: Date.now(), code: '', name: '', qty: 1, unit: 'PCS', price: 0, disc: 0, tax: 11 }]
    });
  };

  const handleRemoveItemRow = (id) => {
    if (formData.items.length === 1) {
      alert('Sales Order minimal harus memiliki 1 item barang!');
      return;
    }
    setFormData({
      ...formData,
      items: formData.items.filter(i => i.id !== id)
    });
  };

  const handleItemChange = (id, field, value) => {
    setFormData({
      ...formData,
      items: formData.items.map(i => i.id === id ? { ...i, [field]: value } : i)
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.customer.trim()) {
      alert('Nama Pelanggan wajib diisi!');
      return;
    }

    if (editingId) {
      setDummySOs(dummySOs.map(item => item.id === editingId ? { ...item, ...formData } : item));
    } else {
      setDummySOs([{ id: Date.now(), ...formData }, ...dummySOs]);
    }
    setViewMode('list');
  };

  const handleDelete = (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus Sales Order ini?')) {
      setDummySOs(dummySOs.filter(item => item.id !== id));
      setActiveMenuId(null);
    }
  };

  // --- TEMPLATE CETAK STANDARD ACCURATE 4 DENGAN LOGO DARI FOLDER PUBLIC ---
  const handlePrint = (item) => {
    setActiveMenuId(null);
    const subTotal = item.items.reduce((acc, curr) => acc + (curr.qty * curr.price), 0);
    const discountTotal = item.items.reduce((acc, curr) => acc + ((curr.qty * curr.price) * (curr.disc || 0) / 100), 0);
    const taxTotal = (subTotal - discountTotal) * 0.11; // PPN 11%
    const grandTotal = (subTotal - discountTotal) + taxTotal;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Sales Order - ${item.soNo}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; color: #000; padding: 20px; margin: 0; }
            .header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .logo-area { width: 55%; vertical-align: top; }
            .company-address { font-size: 10px; line-height: 1.3; color: #333; margin-top: 6px; }
            .title-area { width: 45%; text-align: right; vertical-align: top; }
            .doc-title { font-size: 20px; font-weight: bold; margin: 0 0 5px 0; letter-spacing: 1px; }
            .meta-table { width: 100%; font-size: 11px; margin-bottom: 15px; }
            .meta-table td { padding: 2px 5px; vertical-align: top; }
            .info-box-table { width: 100%; margin-bottom: 15px; border: 1px solid #999; border-collapse: collapse; }
            .info-box-table td { padding: 6px 10px; vertical-align: top; width: 50%; border: 1px solid #999; font-size: 11px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .items-table th, .items-table td { border: 1px solid #000; padding: 6px 8px; font-size: 11px; }
            .items-table th { background: #f0f0f0; text-align: center; }
            .sign-table { width: 100%; margin-top: 30px; text-align: center; }
            .sign-box { height: 60px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td class="logo-area">
                <!-- Logo Vektor Presisi PT. Aldigens Putera Persada -->
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
                  <svg width="45" height="42" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 90 L10 35 L38 10 L38 90 Z" fill="none" stroke="#000" stroke-width="8"/>
                    <path d="M28 90 L28 22 L62 5 L62 90 Z" fill="none" stroke="#000" stroke-width="8"/>
                  </svg>
                  <span style="font-family: Arial, sans-serif; font-weight: 900; font-size: 18px; letter-spacing: 0.5px;">PT. ALDIGENS PUTERA PERSADA</span>
                </div>
                <div class="company-address">
                  Ruko Bekasi Mas Blok C-25<br/>
                  Jl. Jend. Ahmad Yani, Margajaya<br/>
                  Bekasi Selatan - 17141
                </div>
              </td>
              <td class="title-area">
                <div class="doc-title">SALES ORDER</div>
                <div><strong>No :</strong> ${item.soNo}</div>
              </td>
            </tr>
          </table>

          <table class="meta-table">
            <tr>
              <td style="width: 55%;"></td>
              <td style="width: 45%;">
                <table style="width: 100%; font-size: 11px;">
                  <tr><td><strong>Tanggal</strong></td><td>: ${item.date}</td></tr>
                  <tr><td><strong>Reff. PO. No</strong></td><td>: ${item.refPo || '-'}</td></tr>
                  <tr><td><strong>Term Pembayaran</strong></td><td>: ${item.terms}</td></tr>
                  <tr><td><strong>Est. Tgl Kirim</strong></td><td>: ${item.estDate}</td></tr>
                  <tr><td><strong>Dikirim Oleh</strong></td><td>: ${item.sentBy}</td></tr>
                  <tr><td><strong>Salesman</strong></td><td>: ${item.salesman}</td></tr>
                  <tr><td><strong>Halaman</strong></td><td>: 1 / 1</td></tr>
                </table>
              </td>
            </tr>
          </table>

          <table class="info-box-table">
            <tr>
              <td>
                <strong>Pelanggan :</strong><br/>
                <span style="font-size: 13px; font-weight: bold;">${item.customer}</span>
              </td>
              <td>
                <strong>Dikirim Ke :</strong><br/>
                <span>${item.shipTo || '-'}</span>
              </td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%;">No</th>
                <th style="width: 20%;">Kode Barang</th>
                <th style="width: 35%;">Nama Barang</th>
                <th style="width: 8%;">Qty</th>
                <th style="width: 8%;">Satuan</th>
                <th style="width: 12%;">Harga</th>
                <th style="width: 12%;">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              ${item.items.map((i, idx) => `
                <tr>
                  <td align="center">${idx + 1}</td>
                  <td>${i.code}</td>
                  <td>${i.name}</td>
                  <td align="center">${i.qty}</td>
                  <td align="center">${i.unit}</td>
                  <td align="right">${i.price.toLocaleString()}</td>
                  <td align="right">${(i.qty * i.price).toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <table style="width: 100%; margin-top: 10px;">
            <tr>
              <td style="width: 60%; vertical-align: top;">
                <div style="border: 1px solid #999; padding: 8px; min-height: 50px;">
                  <strong>Keterangan :</strong><br/>
                  <span style="color: #333;">${item.remarks || 'Pesanan penjualan sistem terintegrasi ERP.'}</span>
                </div>
              </td>
              <td style="width: 40%; vertical-align: top;">
                <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                  <tr><td style="padding: 4px; border-bottom: 1px solid #ddd;"><strong>Sub Total</strong></td><td align="right" style="padding: 4px; border-bottom: 1px solid #ddd;">${subTotal.toLocaleString()}</td></tr>
                  <tr><td style="padding: 4px; border-bottom: 1px solid #ddd;"><strong>Discount</strong></td><td align="right" style="padding: 4px; border-bottom: 1px solid #ddd;">${discountTotal.toLocaleString()}</td></tr>
                  <tr><td style="padding: 4px; border-bottom: 1px solid #ddd;"><strong>PPN 11%</strong></td><td align="right" style="padding: 4px; border-bottom: 1px solid #ddd;">${taxTotal.toLocaleString()}</td></tr>
                  <tr><td style="padding: 6px; font-size: 12px; font-weight: bold;">Total</td><td align="right" style="padding: 6px; font-size: 12px; font-weight: bold;">${grandTotal.toLocaleString()}</td></tr>
                </table>
              </td>
            </tr>
          </table>

          <table class="sign-table">
            <tr>
              <td style="width: 50%;">
                Dibuat Oleh,<br/>
                <div class="sign-box"></div>
                <strong>( ADMIN )</strong><br/>
                <span style="font-size: 9px; color: #666;">Tgl: ${new Date().toLocaleDateString()}</span>
              </td>
              <td style="width: 50%;">
                Disetujui Oleh,<br/>
                <div class="sign-box"></div>
                <strong>( MANAGER )</strong><br/>
                <span style="font-size: 9px; color: #666;">Tgl: ........................</span>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (viewMode === 'form') {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button onClick={() => setViewMode('list')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
                <ArrowLeft className="h-5 w-5 text-slate-500" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {editingId ? 'Edit Sales Order (SO)' : 'Buat Sales Order Baru'}
                </h2>
                <p className="text-xs text-slate-500">Formulir pesanan penjualan model Accurate 4</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full text-xs font-semibold">
              {formData.soNo}
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 dark:bg-slate-950/50 p-5 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">No. SO</label>
                <input type="text" value={formData.soNo} disabled className="w-full px-4 py-2.5 bg-slate-200/60 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 cursor-not-allowed" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Tanggal</label>
                <input required type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nama Pelanggan</label>
                <input required type="text" placeholder="Contoh: PT. UNITED TRACTORS Tbk" value={formData.customer} onChange={(e) => setFormData({...formData, customer: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Alamat Kirim (Ship To)</label>
                <input type="text" placeholder="Alamat pengiriman barang..." value={formData.shipTo} onChange={(e) => setFormData({...formData, shipTo: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Reff. PO No.</label>
                <input type="text" placeholder="No PO Pelanggan..." value={formData.refPo} onChange={(e) => setFormData({...formData, refPo: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Term Pembayaran</label>
                <input type="text" value={formData.terms} onChange={(e) => setFormData({...formData, terms: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Salesman</label>
                <input type="text" value={formData.salesman} onChange={(e) => setFormData({...formData, salesman: e.target.value})} className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-blue-500" /> Detail Item Penjualan
                </h3>
                <button type="button" onClick={handleAddItemRow} className="flex items-center gap-1.5 text-xs bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-semibold px-3 py-1.5 rounded-lg transition">
                  <Plus className="h-3.5 w-3.5" /> Tambah Baris Barang
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3 w-12 text-center">#</th>
                      <th className="px-4 py-3">Kode Barang</th>
                      <th className="px-4 py-3">Nama Barang</th>
                      <th className="px-4 py-3 w-24">Qty</th>
                      <th className="px-4 py-3 w-28">Satuan</th>
                      <th className="px-4 py-3 w-36">Harga (Rp)</th>
                      <th className="px-4 py-3 w-16 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {formData.items.map((item, index) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-3 text-center text-slate-400 font-medium text-xs">{index + 1}</td>
                        <td className="px-4 py-3">
                          <input required type="text" placeholder="Kode..." value={item.code} onChange={(e) => handleItemChange(item.id, 'code', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                        </td>
                        <td className="px-4 py-3">
                          <input required type="text" placeholder="Nama barang..." value={item.name} onChange={(e) => handleItemChange(item.id, 'name', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                        </td>
                        <td className="px-4 py-3">
                          <input required type="number" min="1" value={item.qty} onChange={(e) => handleItemChange(item.id, 'qty', Number(e.target.value))} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                        </td>
                        <td className="px-4 py-3">
                          <select value={item.unit} onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white">
                            <option value="PCS">PCS</option>
                            <option value="Unit">Unit</option>
                            <option value="Set">Set</option>
                            <option value="Batang">Batang</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input required type="number" min="0" value={item.price} onChange={(e) => handleItemChange(item.id, 'price', Number(e.target.value))} className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button type="button" onClick={() => handleRemoveItemRow(item.id)} className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 rounded-lg transition" title="Hapus Baris">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-medium transition">Batal</button>
              <button type="submit" className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-500/25 transition">
                <Save className="h-4 w-4" /> Simpan Sales Order
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Cari no. SO atau pelanggan..." 
                className="pl-10 pr-4 py-2.5 w-full sm:w-80 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-200"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <button onClick={handleOpenAddForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition">
            <Plus className="h-4 w-4" />
            Buat Sales Order (SO) Baru
          </button>
        </div>

        <div className="overflow-x-auto min-h-[350px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-3.5">Tanggal</th>
                <th className="px-6 py-3.5">No. SO</th>
                <th className="px-6 py-3.5">Pelanggan</th>
                <th className="px-6 py-3.5">Reff. PO</th>
                <th className="px-6 py-3.5">Salesman</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {dummySOs.filter(item => item.soNo.toLowerCase().includes(searchTerm.toLowerCase()) || item.customer.toLowerCase().includes(searchTerm.toLowerCase())).map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition relative">
                  <td className="px-6 py-4">{item.date}</td>
                  <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">{item.soNo}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-100">{item.customer}</td>
                  <td className="px-6 py-4 text-slate-500">{item.refPo || '-'}</td>
                  <td className="px-6 py-4">{item.salesman}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-max bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center relative">
                    <button 
                      onClick={() => setActiveMenuId(activeMenuId === item.id ? null : item.id)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                      <MoreVertical className="h-4 w-4 inline" />
                    </button>

                    {activeMenuId === item.id && (
                      <div className="absolute right-12 top-10 w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl py-1.5 z-20 text-left">
                        <button 
                          onClick={() => handleOpenEditForm(item)}
                          className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                        >
                          <Edit3 className="h-4 w-4 text-blue-500" /> Edit SO
                        </button>
                        <button 
                          onClick={() => handlePrint(item)}
                          className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                        >
                          <Printer className="h-4 w-4 text-emerald-500" /> Cetak Dokumen
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="w-full px-4 py-2 text-xs font-medium flex items-center gap-2.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-t border-slate-100 dark:border-slate-700"
                        >
                          <Trash2 className="h-4 w-4" /> Hapus SO
                        </button>
                      </div>
                    )}
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