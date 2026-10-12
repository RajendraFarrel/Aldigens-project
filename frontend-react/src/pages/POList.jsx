import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { swalConfirm, swalSuccess, swalError } from '../utils/swal';
import { PlusCircle, X, Trash2, Plus, Printer } from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

export default function POList() {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [inventoryItems, setInventoryItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const pagination = usePagination(purchaseOrders, 10);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        po_number: '',
        date: new Date().toISOString().split('T')[0],
        supplier_name: '',
        supplier_address: 'Jakarta',
        supplier_phone: '-',
        supplier_email: '-',
        subject: '',
        tax_percentage: 0, // Diubah menjadi persentase (default 0%)
        items: [{ part_number: '', description: '', qty: 1, unit_price: 0 }],
    });

    useEffect(() => {
        fetchPurchaseOrders();
        fetchInventoryParts();
    }, []);

    const fetchPurchaseOrders = async () => {
        setLoading(true);
        try {
            const response = await api.get('/purchase-orders').catch(() => null);
            const apiData = response?.data?.data || response?.data;
            
            if (Array.isArray(apiData) && apiData.length > 0) {
                setPurchaseOrders(apiData);
            } else {
                const localData = JSON.parse(localStorage.getItem('aldigens_purchase_orders') || localStorage.getItem('purchase_orders') || '[]');
                setPurchaseOrders(localData);
            }
        } catch (error) {
            const localData = JSON.parse(localStorage.getItem('aldigens_purchase_orders') || localStorage.getItem('purchase_orders') || '[]');
            setPurchaseOrders(localData);
        } finally {
            setLoading(false);
        }
    };

    const fetchInventoryParts = async () => {
        try {
            const response = await api.get('/inventory/products').catch(() => null);
            const apiData = response?.data?.data || response?.data;
            
            if (Array.isArray(apiData) && apiData.length > 0) {
                setInventoryItems(apiData);
            } else if (Array.isArray(response?.data)) {
                setInventoryItems(response.data);
            } else {
                const localParts = JSON.parse(localStorage.getItem('aldigens_products') || localStorage.getItem('aldigens_customer_part_numbers') || '[]');
                setInventoryItems(localParts);
            }
        } catch (err) {
            const localParts = JSON.parse(localStorage.getItem('aldigens_products') || localStorage.getItem('aldigens_customer_part_numbers') || '[]');
            setInventoryItems(localParts);
        }
    };

    // Kalkulasi Subtotal, PPN, dan Grand Total
    const calculatedSubTotal = formData.items.reduce((acc, item) => {
        return acc + (Number(item.qty || 0) * Number(item.unit_price || 0));
    }, 0);

    const numericTaxPercent = Number(formData.tax_percentage || 0);
    // Menghitung nominal pajak dari persentase (Subtotal * Persentase / 100)
    const calculatedTaxAmount = Math.round(calculatedSubTotal * (numericTaxPercent / 100)); 
    const calculatedGrandTotal = calculatedSubTotal + calculatedTaxAmount;

    const handleAddItem = () => {
        setFormData({ ...formData, items: [...formData.items, { part_number: '', description: '', qty: 1, unit_price: 0 }] });
    };

    const handleRemoveItem = (index) => {
        if (formData.items.length === 1) return;
        setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
    };

    const handleItemChange = (index, field, value) => {
        const updatedItems = [...formData.items];
        updatedItems[index][field] = value;

        if (field === 'part_number') {
            const selectedPart = inventoryItems.find(p => p.part_number === value || p.product_code === value || p.id?.toString() === value);
            if (selectedPart) {
                updatedItems[index].description = selectedPart.name || selectedPart.description || value;
            }
        }

        setFormData({ ...formData, items: updatedItems });
    };

    const resetForm = () => setFormData({
        po_number: '',
        date: new Date().toISOString().split('T')[0],
        supplier_name: '',
        supplier_address: 'Jakarta',
        supplier_phone: '-',
        supplier_email: '-',
        subject: '',
        tax_percentage: 0,
        items: [{ part_number: '', description: '', qty: 1, unit_price: 0 }],
    });

    const handleSubmitNewPO = async (e) => {
        e.preventDefault();
        try {
            const formattedItems = formData.items.map((item) => {
                const amount = Number(item.qty) * Number(item.unit_price);
                return {
                    part_number: item.part_number || 'PART-GENERAL',
                    description: item.description,
                    qty: Number(item.qty),
                    unit: 'PCS',
                    unit_price: Number(item.unit_price),
                    amount: amount,
                };
            });

            const newPOItem = {
                id: Date.now(),
                po_number: formData.po_number,
                customer_po_number: formData.po_number,
                date: formData.date,
                po_date: formData.date,
                customer_name: formData.supplier_name,
                customer_address: formData.supplier_address,
                subject: formData.subject,
                sub_total: calculatedSubTotal,
                tax_amount: calculatedTaxAmount, // Simpan nominal yang sudah dihitung agar cetak tetap akurat
                tax_percentage: numericTaxPercent,
                grand_total: calculatedGrandTotal,
                items: formattedItems,
                status: 'Pending'
            };

            try {
                await api.post('/purchase-orders', newPOItem);
            } catch (err) {
                console.log('Disimpan ke local storage.');
            }

            const existingLocal = JSON.parse(localStorage.getItem('aldigens_purchase_orders') || '[]');
            const updatedList = [newPOItem, ...existingLocal];
            localStorage.setItem('aldigens_purchase_orders', JSON.stringify(updatedList));

            swalSuccess('Berhasil', 'Purchase Order baru berhasil dibuat!');
            setIsModalOpen(false);
            resetForm();
            fetchPurchaseOrders();
        } catch (error) {
            swalError('Gagal Menyimpan', 'Periksa kembali inputan Anda.');
        }
    };

    const handleConvertToReceiveItem = async (id) => {
        const ok = await swalConfirm({
            title: 'Proses ke Receive Item (RI)?',
            text: 'Purchase Order ini akan diterima di gudang dan otomatis mencatat stok masuk.',
            confirmText: 'Ya, Terima Barang',
            cancelText: 'Batal',
            icon: 'question',
        });
        if (!ok) return;

        try {
            const targetPO = purchaseOrders.find(po => po.id === id || po.po_number === id);

            if (targetPO) {
                const newRI = {
                    id: Date.now(),
                    ri_number: `RI-${Math.floor(100000 + Math.random() * 900000)}`,
                    po_reference: targetPO.po_number || targetPO.customer_po_number,
                    supplier_name: targetPO.customer_name || 'Supplier Umum',
                    date: new Date().toISOString().split('T')[0],
                    status: 'Completed',
                    items: targetPO.items || []
                };

                const existingRIs = JSON.parse(localStorage.getItem('aldigens_receive_items') || '[]');
                localStorage.setItem('aldigens_receive_items', JSON.stringify([newRI, ...existingRIs]));
            }

            const updated = purchaseOrders.map(po => {
                if (po.id === id || po.po_number === id) {
                    return { ...po, status: 'Received (RI)' };
                }
                return po;
            });
            setPurchaseOrders(updated);
            localStorage.setItem('aldigens_purchase_orders', JSON.stringify(updated));

            swalSuccess('Berhasil', 'Barang berhasil diterima di gudang (Receive Item tercatat)!');
            fetchPurchaseOrders();
        } catch (error) {
            swalError('Gagal', 'Terjadi kesalahan saat memproses penerimaan barang.');
        }
    };

    const handlePrintPO = (po) => {
        const itemsList = po.items || [];
        const subTotal = po.sub_total ?? itemsList.reduce((acc, curr) => acc + (Number(curr.qty) * Number(curr.unit_price || 0)), 0);
        const taxTotal = po.tax_amount ?? (subTotal * 0.11);
        const grandTotal = po.grand_total ?? (subTotal + taxTotal);
        const taxLabel = po.tax_percentage ? `PPN ${po.tax_percentage}%` : 'PPN';

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Purchase Order - ${po.po_number || 'PO'}</title>
                    <style>
                        @page { size: A4 portrait; margin: 10mm; }
                        body { font-family: Arial, sans-serif; font-size: 10px; color: #000; padding: 0; margin: 0; }
                        .header-table { width: 100%; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
                        .logo-area { width: 55%; vertical-align: top; }
                        .company-address { font-size: 8.5px; line-height: 1.2; color: #222; }
                        .title-area { width: 45%; text-align: right; vertical-align: top; }
                        .doc-title { font-size: 16px; font-weight: bold; margin: 0 0 2px 0; }
                        .recipient-table { width: 100%; margin-bottom: 10px; border: 1px solid #000; border-collapse: collapse; }
                        .recipient-table td { padding: 5px 8px; vertical-align: top; width: 50%; border: 1px solid #000; font-size: 9.5px; }
                        .items-table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
                        .items-table th, .items-table td { border: 1px solid #000; padding: 4px 6px; font-size: 9.5px; }
                        .items-table th { background-color: #f1f5f9; text-align: center; font-weight: bold; }
                        .middle-container { width: 100%; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; display: table; }
                        .terbilang-box { display: table-cell; width: 60%; padding: 8px; vertical-align: top; font-size: 9.5px; border-right: 1px solid #000; }
                        .summary-box { display: table-cell; width: 40%; vertical-align: top; }
                        .summary-table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
                        .summary-table td { padding: 4px 8px; border-bottom: 1px solid #000; }
                        .summary-table .total-row { background-color: #f1f5f9; font-weight: bold; font-size: 11px; }
                        .sign-container { margin-top: 15px; width: 100%; border: 1px solid #000; border-collapse: collapse; }
                        .sign-container td { border: 1px solid #000; padding: 5px; text-align: center; font-size: 9.5px; width: 50%; height: 45px; }
                    </style>
                </head>
                <body>
                    <table class="header-table">
                        <tr>
                            <td class="logo-area">
                                <div class="company-address">
                                    <strong>PT. ALDIGENS PUTERA PERSADA</strong><br/>
                                    Ruko Bekasi Mas Blok C-25, Jl. Jend. Ahmad Yani, Margajaya, Bekasi Selatan
                                </div>
                            </td>
                            <td class="title-area">
                                <div class="doc-title">PURCHASE ORDER</div>
                                <div><strong>No :</strong> ${po.po_number || '-'}</div>
                            </td>
                        </tr>
                    </table>
                    <table class="recipient-table">
                        <tr>
                            <td><strong>Vendor :</strong><br/><strong>${po.customer_name || '-'}</strong><br/><span>${po.customer_address || '-'}</span></td>
                            <td><strong>PO Date :</strong> ${po.date || '-'}<br/><strong>Terms :</strong> C.O.D</td>
                        </tr>
                    </table>
                    <table class="items-table">
                        <thead>
                            <tr>
                                <th style="width: 5%;">No</th>
                                <th style="width: 25%;">Part Number</th>
                                <th style="width: 30%;">Description</th>
                                <th style="width: 10%;">Qty</th>
                                <th style="width: 15%;">Unit Price</th>
                                <th style="width: 15%;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsList.map((item, idx) => `
                                <tr>
                                    <td align="center">${idx + 1}</td>
                                    <td>${item.part_number || '-'}</td>
                                    <td>${item.description || '-'}</td>
                                    <td align="center">${item.qty}</td>
                                    <td align="right">${Number(item.unit_price || 0).toLocaleString('id-ID')}</td>
                                    <td align="right">${(Number(item.qty) * Number(item.unit_price || 0)).toLocaleString('id-ID')}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <table class="middle-container" cellpadding="0" cellspacing="0">
                        <tr>
                            <td class="terbilang-box"><strong>Keterangan:</strong><br/><span>${po.subject || '-'}</span></td>
                            <td class="summary-box">
                                <table class="summary-table">
                                    <tr><td>Sub Total</td><td align="right"><strong>${Number(subTotal).toLocaleString('id-ID')}</strong></td></tr>
                                    <tr><td>${taxLabel}</td><td align="right">${Number(taxTotal).toLocaleString('id-ID')}</td></tr>
                                    <tr class="total-row"><td>Total Order</td><td align="right">IDR ${Number(grandTotal).toLocaleString('id-ID')}</td></tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                    <table class="sign-container">
                        <tr><td>Prepared By,<br/><br/><strong>( PURCHASING )</strong></td><td>Approved By,<br/><br/><strong>( DIRECTOR )</strong></td></tr>
                    </table>
                    <script>window.onload = function() { window.focus(); setTimeout(() => { window.print(); }, 500); };</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (loading) return <div className="p-6 text-slate-600">Memuat data Purchase Order...</div>;

    return (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Daftar Purchase Order (PO)</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition cursor-pointer"
                >
                    <PlusCircle className="h-4 w-4" />
                    <span>Input PO Baru</span>
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. PO / Supplier</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {pagination.paginatedItems.length > 0 ? (
                            pagination.paginatedItems.map((po, idx) => (
                                <tr key={po.id || idx}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                                        {po.po_number} <br/><span className="text-xs text-slate-500">{po.customer_name}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{po.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${po.status?.includes('Received') ? 'bg-emerald-100 text-emerald-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {po.status || 'Pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => handlePrintPO(po)}
                                            className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded transition inline-flex items-center space-x-1 cursor-pointer"
                                        >
                                            <Printer className="h-3.5 w-3.5" />
                                            <span>Cetak</span>
                                        </button>
                                        {!po.status?.includes('Received') ? (
                                            <button
                                                onClick={() => handleConvertToReceiveItem(po.id || po.po_number)}
                                                className="text-indigo-600 bg-indigo-50 px-3 py-1 rounded transition cursor-pointer"
                                            >
                                                Proses ke Receive Item
                                            </button>
                                        ) : (
                                            <span className="text-gray-400 italic">Sudah Diterima</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="4" className="px-6 py-4 text-center text-sm text-slate-500">Belum ada data Purchase Order.</td></tr>
                        )}
                    </tbody>
                </table>
                <Pagination currentPage={pagination.currentPage} totalItems={pagination.totalItems} pageSize={pagination.pageSize} onPageChange={pagination.setCurrentPage} onPageSizeChange={pagination.setPageSize} />
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">Input Purchase Order (PO) ke Supplier</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSubmitNewPO} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nomor PO</label>
                                    <input type="text" required placeholder="Contoh: PO-2026-001" value={formData.po_number} onChange={(e) => setFormData({ ...formData, po_number: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tanggal PO</label>
                                    <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nama Supplier / Vendor</label>
                                    <input type="text" required placeholder="Contoh: PT. Sumber Baja Perkasa" value={formData.supplier_name} onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Subjek / Proyek</label>
                                    <input type="text" required placeholder="Contoh: Pengadaan Material" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Alamat Supplier</label>
                                <input type="text" required placeholder="Alamat lengkap supplier" value={formData.supplier_address} onChange={(e) => setFormData({ ...formData, supplier_address: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                            </div>

                            <div className="border-t border-slate-200 pt-4 mt-2">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold text-sm text-slate-700">Daftar Item / Part Number</h4>
                                    <button type="button" onClick={handleAddItem} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1 cursor-pointer">
                                        <Plus className="h-3.5 w-3.5" /><span>Tambah Baris Item</span>
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500">Item #{index + 1}</span>
                                                {formData.items.length > 1 && (
                                                    <button type="button" onClick={() => handleRemoveItem(index)} className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Pilih Part Number / Inventory</label>
                                                    <select
                                                        value={item.part_number}
                                                        onChange={(e) => handleItemChange(index, 'part_number', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                    >
                                                        <option value="">-- Pilih Part Number --</option>
                                                        {inventoryItems.map((inv, idx) => (
                                                            <option key={inv.id || idx} value={inv.part_number || inv.product_code}>
                                                                {inv.part_number || inv.product_code} — {inv.name || inv.description}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Deskripsi / Spesifikasi</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Deskripsi barang"
                                                        value={item.description}
                                                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Kuantitas (QTY)</label>
                                                    <input type="number" min="1" required value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Harga Satuan (IDR)</label>
                                                    <input type="number" min="0" required placeholder="0" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bagian Ringkasan Harga & PPN Persentase */}
                            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600 font-medium">Sub Total:</span>
                                    <span className="font-bold text-slate-800">Rp {calculatedSubTotal.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-200 pt-3">
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-semibold text-slate-700">PPN (%):</label>
                                        <div className="flex gap-1">
                                            <button type="button" onClick={() => setFormData({ ...formData, tax_percentage: 11 })} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 cursor-pointer">11%</button>
                                            <button type="button" onClick={() => setFormData({ ...formData, tax_percentage: 0 })} className="px-2 py-0.5 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300 cursor-pointer">0%</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <input 
                                            type="number" 
                                            min="0"
                                            max="100"
                                            placeholder="0" 
                                            value={formData.tax_percentage} 
                                            onChange={(e) => setFormData({ ...formData, tax_percentage: e.target.value === '' ? 0 : Number(e.target.value) })} 
                                            className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-center font-bold text-slate-900"
                                        />
                                        <span className="text-sm font-medium text-slate-500 w-32 text-right">
                                            (+ Rp {calculatedTaxAmount.toLocaleString('id-ID')})
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between text-base border-t border-slate-200 pt-3">
                                    <span className="font-bold text-slate-900">Grand Total:</span>
                                    <span className="font-extrabold text-blue-600">Rp {calculatedGrandTotal.toLocaleString('id-ID')}</span>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 cursor-pointer">Batal</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer">Simpan PO</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}