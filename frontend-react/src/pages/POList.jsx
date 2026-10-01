import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { swalConfirm, swalSuccess, swalError } from '../utils/swal';
import { PlusCircle, X, Trash2, Plus, Printer } from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

export default function POList() {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const pagination = usePagination(purchaseOrders, 10);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        quotation_number: '',
        date: new Date().toISOString().split('T')[0],
        admin_sales: '',
        customer_name: '',
        customer_address: 'Jakarta',
        customer_phone: '-',
        customer_email: '-',
        subject: '',
        items: [{ description: '', qty: 1, unit_price: 0 }],
    });

    useEffect(() => {
        fetchPurchaseOrders();
    }, []);

    const fetchPurchaseOrders = async () => {
        setLoading(true);
        try {
            // Coba ambil dari backend jika tersedia
            const response = await api.get('/purchase-orders').catch(() => null);
            const apiData = response?.data?.data || response?.data;
            
            if (Array.isArray(apiData) && apiData.length > 0) {
                setPurchaseOrders(apiData);
            } else {
                // Fallback / ambil sinkronisasi dari localStorage (dari Quotation Deal atau input manual PO)
                const localData = JSON.parse(localStorage.getItem('aldigens_purchase_orders') || localStorage.getItem('purchase_orders') || '[]');
                setPurchaseOrders(localData);
            }
        } catch (error) {
            console.warn("Menggunakan data lokal untuk PO:", error);
            const localData = JSON.parse(localStorage.getItem('aldigens_purchase_orders') || localStorage.getItem('purchase_orders') || '[]');
            setPurchaseOrders(localData);
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        setFormData({ ...formData, items: [...formData.items, { description: '', qty: 1, unit_price: 0 }] });
    };

    const handleRemoveItem = (index) => {
        if (formData.items.length === 1) return;
        setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...formData.items];
        updatedItems[index][field] = value;
        setFormData({ ...formData, items: updatedItems });
    };

    const resetForm = () => setFormData({
        quotation_number: '',
        date: new Date().toISOString().split('T')[0],
        admin_sales: '',
        customer_name: '',
        customer_address: 'Jakarta',
        customer_phone: '-',
        customer_email: '-',
        subject: '',
        items: [{ description: '', qty: 1, unit_price: 0 }],
    });

    const handleSubmitNewPO = async (e) => {
        e.preventDefault();
        try {
            let calculatedSubTotal = 0;
            const formattedItems = formData.items.map((item) => {
                const amount = Number(item.qty) * Number(item.unit_price);
                calculatedSubTotal += amount;
                return {
                    part_number: 'PART-' + Math.floor(Math.random() * 1000),
                    description: item.description,
                    qty: Number(item.qty),
                    unit: 'SET',
                    unit_price: Number(item.unit_price),
                    amount: amount,
                };
            });

            const taxAmount = calculatedSubTotal * 0.11;
            const grandTotal = calculatedSubTotal + taxAmount;

            const newPOItem = {
                id: Date.now(),
                quotation_number: formData.quotation_number,
                customer_po_number: formData.quotation_number,
                date: formData.date,
                po_date: formData.date,
                admin_sales: formData.admin_sales,
                customer_name: formData.customer_name,
                customer_address: formData.customer_address,
                attention_person: 'Bpk. / Ibu',
                customer_phone: formData.customer_phone,
                customer_email: formData.customer_email,
                subject: formData.subject,
                currency: 'IDR (Rupiah)',
                sub_total: calculatedSubTotal,
                tax_amount: taxAmount,
                grand_total: grandTotal,
                items: formattedItems,
                status: 'Pending'
            };

            // Simpan ke database jika API siap, dan selalu simpan ke localStorage agar aman
            try {
                await api.post('/purchase-orders', newPOItem);
            } catch (err) {
                console.log('API PO belum aktif, disimpan ke local storage.');
            }

            const existingLocal = JSON.parse(localStorage.getItem('aldigens_purchase_orders') || '[]');
            const updatedList = [newPOItem, ...existingLocal];
            localStorage.setItem('aldigens_purchase_orders', JSON.stringify(updatedList));

            swalSuccess('Berhasil', 'PO baru berhasil ditambahkan!');
            setIsModalOpen(false);
            resetForm();
            fetchPurchaseOrders();
        } catch (error) {
            console.error('Terjadi kesalahan saat menyimpan PO:', error);
            swalError('Gagal Menyimpan', 'Periksa kembali inputan Anda.');
        }
    };

    const handleConvertToSO = async (id) => {
        const ok = await swalConfirm({
            title: 'Proses ke Sales Order?',
            text: 'Purchase Order ini akan dikonversi menjadi Sales Order.',
            confirmText: 'Ya, Proses',
            cancelText: 'Batal',
            icon: 'question',
        });
        if (!ok) return;

        try {
            // Cari data PO yang akan diproses berdasarkan id atau nomor PO
            const targetPO = purchaseOrders.find(po => po.id === id || po.quotation_number === id || po.po_number === id);

            if (targetPO) {
                // Buat objek Sales Order baru dari data PO
                const newSO = {
                    id: Date.now(),
                    so_number: `SO-${Math.floor(10000000 + Math.random() * 90000000)}`,
                    date: new Date().toISOString().split('T')[0],
                    customer_name: targetPO.customer_name || 'Pelanggan Umum',
                    reff_po: targetPO.po_number || targetPO.customer_po_number || targetPO.quotation_number,
                    salesman: targetPO.admin_sales || 'FIKHAY',
                    status: 'Disetujui',
                    subject: targetPO.subject || 'FABRICATION',
                    items: targetPO.items || []
                };

                // Simpan ke localStorage untuk Sales Order (mendukung key umum yang biasa dibaca modul SO)
                ['aldigens_sales_orders', 'sales_orders'].forEach(storageKey => {
                    const existingSOs = JSON.parse(localStorage.getItem(storageKey) || '[]');
                    const filtered = existingSOs.filter(so => so.reff_po !== newSO.reff_po);
                    localStorage.setItem(storageKey, JSON.stringify([newSO, ...filtered]));
                });
            }

            await api.post(`/purchase-orders/${id}/convert-to-so`).catch(() => {});
            
            // Update status PO lokal menjadi processed_to_so
            const updated = purchaseOrders.map(po => {
                if (po.id === id || po.quotation_number === id) {
                    return { ...po, status: 'processed_to_so' };
                }
                return po;
            });
            setPurchaseOrders(updated);
            localStorage.setItem('aldigens_purchase_orders', JSON.stringify(updated));

            swalSuccess('Berhasil', 'Berhasil diproses ke Sales Order!');
            fetchPurchaseOrders();
        } catch (error) {
            swalError('Gagal memproses', 'Terjadi kesalahan saat memproses PO ke SO.');
        }
    };

    const handlePrintPO = (po) => {
        const itemsList = po.items || [];
        const subTotal = itemsList.reduce((acc, curr) => acc + (Number(curr.qty) * Number(curr.unit_price || curr.price || 0)), 0);
        const taxTotal = subTotal * 0.11;
        const grandTotal = subTotal + taxTotal;

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Purchase Order - ${po.customer_po_number || po.quotation_number}</title>
                    <style>
                        body { font-family: Arial, sans-serif; font-size: 11px; color: #000; padding: 20px; margin: 0; }
                        .header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
                        .logo-area { width: 50%; vertical-align: top; }
                        .company-address { font-size: 9px; line-height: 1.3; color: #333; margin-top: 4px; }
                        .title-area { width: 50%; text-align: right; vertical-align: top; }
                        .doc-title { font-size: 18px; font-weight: bold; margin: 0 0 4px 0; letter-spacing: 0.5px; }
                        .meta-table { width: 100%; font-size: 10px; margin-bottom: 12px; }
                        .meta-table td { padding: 2px 4px; vertical-align: top; }
                        .info-box-table { width: 100%; margin-bottom: 12px; border: 1px solid #999; border-collapse: collapse; }
                        .info-box-table td { padding: 5px 8px; vertical-align: top; width: 50%; border: 1px solid #999; font-size: 10px; }
                        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
                        .items-table th, .items-table td { border: 1px solid #000; padding: 5px 6px; font-size: 10px; }
                        .items-table th { background: #f0f0f0; text-align: center; }
                        .sign-container { margin-top: 90px; page-break-inside: avoid; }
                        .sign-table { width: 100%; text-align: center; font-size: 10px; }
                        .sign-box { height: 60px; }
                    </style>
                </head>
                <body>
                    <table class="header-table">
                        <tr>
                            <td class="logo-area">
                                <div style="font-weight: 900; font-size: 15px; margin-bottom: 3px;">PT. ALDIGENS PUTERA PERSADA</div>
                                <div class="company-address">
                                    Ruko Bekasi Mas Blok C-25<br/>
                                    Jl. Jend. Ahmad Yani, Margajaya, Bekasi Selatan - 17141
                                </div>
                            </td>
                            <td class="title-area">
                                <div class="doc-title">Purchase Order</div>
                                <div><strong>PO Number :</strong> ${po.customer_po_number || po.quotation_number || '-'}</div>
                            </td>
                        </tr>
                    </table>

                    <table class="info-box-table">
                        <tr>
                            <td>
                                <strong>Vendor / Customer :</strong><br/>
                                <span style="font-size: 12px; font-weight: bold;">${po.customer_name || 'Vendor Umum'}</span><br/>
                                <span>${po.customer_address || '-'}</span>
                            </td>
                            <td>
                                <strong>Ship To :</strong><br/>
                                <span>Ruko Bekasi Mas Blok C-25, Bekasi Selatan</span>
                            </td>
                        </tr>
                    </table>

                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width: 5%;">Item</th>
                                <th style="width: 45%;">Description</th>
                                <th style="width: 10%;">Qty</th>
                                <th style="width: 20%;">Unit Price</th>
                                <th style="width: 20%;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsList.map((item, idx) => `
                                <tr>
                                    <td align="center">${idx + 1}</td>
                                    <td>${item.description || item.part_number || '-'}</td>
                                    <td align="center">${item.qty}</td>
                                    <td align="right">${Number(item.unit_price || 0).toLocaleString()}</td>
                                    <td align="right">${(Number(item.qty) * Number(item.unit_price || 0)).toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>

                    <table style="width: 100%; margin-top: 25px;">
                        <tr>
                            <td style="width: 55%; vertical-align: top;">
                                <strong>Description :</strong><br/>
                                <span>${po.subject || 'Pengadaan barang operasional perusahaan.'}</span>
                            </td>
                            <td style="width: 45%; vertical-align: top;">
                                <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
                                    <tr><td style="padding: 4px; border-bottom: 1px solid #ddd;"><strong>Sub Total</strong></td><td align="right" style="padding: 4px; border-bottom: 1px solid #ddd;">${subTotal.toLocaleString()}</td></tr>
                                    <tr><td style="padding: 4px; border-bottom: 1px solid #ddd;"><strong>PPN 11%</strong></td><td align="right" style="padding: 4px; border-bottom: 1px solid #ddd;">${taxTotal.toLocaleString()}</td></tr>
                                    <tr><td style="padding: 6px; font-size: 11px; font-weight: bold;">Total Order</td><td align="right" style="padding: 6px; font-size: 11px; font-weight: bold;">${grandTotal.toLocaleString()}</td></tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <div class="sign-container">
                        <table class="sign-table">
                            <tr>
                                <td style="width: 50%;">
                                    Prepared By,<br/><div class="sign-box"></div><strong>( PURCHASING )</strong>
                                </td>
                                <td style="width: 50%;">
                                    Approved By,<br/><div class="sign-box"></div><strong>( DIRECTOR )</strong>
                                </td>
                            </tr>
                        </table>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    if (loading) return <div className="p-6 text-slate-600">Memuat data Purchase Order...</div>;

    return (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Daftar Purchase Order (PO)</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition shadow-xs cursor-pointer"
                >
                    <PlusCircle className="h-4 w-4" />
                    <span>Input PO Baru</span>
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">No. PO / Klien</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {pagination.paginatedItems.length > 0 ? (
                            pagination.paginatedItems.map((po, idx) => (
                                <tr key={po.id || idx}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                                        {po.po_number || po.customer_po_number || po.quotation_number}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                                        {po.po_date || po.date}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${po.status === 'processed_to_so' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {po.status || 'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => handlePrintPO(po)}
                                            className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/15 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 px-3 py-1 rounded transition inline-flex items-center space-x-1 cursor-pointer"
                                            title="Cetak Dokumen PO"
                                        >
                                            <Printer className="h-3.5 w-3.5" />
                                            <span>Cetak</span>
                                        </button>

                                        {po.status !== 'processed_to_so' ? (
                                            <button
                                                onClick={() => handleConvertToSO(po.id || po.quotation_number)}
                                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 px-3 py-1 rounded transition cursor-pointer"
                                            >
                                                Proses ke SO
                                            </button>
                                        ) : (
                                            <span className="text-gray-400 dark:text-slate-500 italic">Sudah di-SO</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-slate-400">
                                    Belum ada data Purchase Order. Silakan buat penawaran lalu klik "Deal (ke PO)" di menu Quotation.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination Controller */}
                <Pagination
                    currentPage={pagination.currentPage}
                    totalItems={pagination.totalItems}
                    pageSize={pagination.pageSize}
                    onPageChange={pagination.setCurrentPage}
                    onPageSizeChange={pagination.setPageSize}
                />
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">Input Data PO</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitNewPO} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nomor Quotation / PO</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: AQ-26090003"
                                        value={formData.quotation_number}
                                        onChange={(e) => setFormData({ ...formData, quotation_number: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tanggal Dokumen</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nama Klien / Perusahaan</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: PT SANY PERKASA"
                                        value={formData.customer_name}
                                        onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Admin Sales</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Nama Admin Sales"
                                        value={formData.admin_sales}
                                        onChange={(e) => setFormData({ ...formData, admin_sales: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Alamat Lengkap Klien</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Jl. Angkasa 1-3 Gunung Sahari Utara Sawah Besar - Jakarta Pusat"
                                    value={formData.customer_address}
                                    onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Subjek / Proyek</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: FABRICATION / OVERHAUL"
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="border-t border-slate-200 pt-4 mt-2">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold text-sm text-slate-700">Daftar Spesifikasi Barang / Item</h4>
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1 transition cursor-pointer"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Tambah Baris Item</span>
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500">Item #{index + 1}</span>
                                                {formData.items.length > 1 && (
                                                    <button type="button" onClick={() => handleRemoveItem(index)} className="text-rose-500 hover:text-rose-700 p-1 transition cursor-pointer">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Deskripsi Barang / Unit</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="Contoh: REINFORCE MODIFICATION FLAT BUCKET"
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Kuantitas (QTY)</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        required
                                                        value={item.qty}
                                                        onChange={(e) => handleItemChange(index, 'qty', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Harga Satuan (IDR)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        required
                                                        placeholder="Contoh: 1850000"
                                                        value={item.unit_price}
                                                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition cursor-pointer">
                                    Batal
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs cursor-pointer">
                                    Simpan PO
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}