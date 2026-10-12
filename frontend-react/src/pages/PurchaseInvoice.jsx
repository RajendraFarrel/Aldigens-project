import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { swalConfirm, swalSuccess, swalError } from '../utils/swal';
import { PlusCircle, X, Trash2, Plus } from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

export default function PurchaseInvoice() {
    const [invoices, setInvoices] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const pagination = usePagination(invoices, 10);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        invoice_number: `PI-${Math.floor(100000 + Math.random() * 900000)}`,
        po_reference: '',
        supplier_name: '',
        supplier_address: 'Jakarta',
        date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{ part_number: '', description: '', qty: 1, unit_price: 0 }],
    });

    useEffect(() => {
        fetchInvoices();
        fetchPurchaseOrders();
    }, []);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const response = await api.get('/invoices').catch(() => null);
            const apiData = response?.data?.data || response?.data;
            
            if (Array.isArray(apiData) && apiData.length > 0) {
                setInvoices(apiData);
            } else {
                const localData = JSON.parse(localStorage.getItem('aldigens_purchase_invoices') || '[]');
                setInvoices(localData);
            }
        } catch (error) {
            const localData = JSON.parse(localStorage.getItem('aldigens_purchase_invoices') || '[]');
            setInvoices(localData);
        } finally {
            setLoading(false);
        }
    };

    // Ambil data PO dari API atau gabungkan dari seluruh kemungkinan Local Storage
    const fetchPurchaseOrders = async () => {
        let allPOs = [];
        try {
            const response = await api.get('/purchase-orders').catch(() => null);
            const apiData = response?.data?.data || response?.data;
            if (Array.isArray(apiData)) {
                allPOs = [...apiData];
            }
        } catch (err) {
            // Abaikan error API
        }

        // Ambil juga dari semua kemungkinan key local storage PO
        const possibleKeys = ['aldigens_purchase_orders', 'purchase_orders', 'po_list'];
        possibleKeys.forEach(key => {
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        allPOs = [...allPOs, ...parsed];
                    }
                } catch (e) {}
            }
        });

        // Hapus duplikat berdasarkan nomor PO / id
        const uniquePOs = Array.from(new Map(allPOs.map(po => [po.po_number || po.customer_po_number || po.id, po])).values());
        setPurchaseOrders(uniquePOs);
    };

    const handleSelectPO = (poIdentifier) => {
        if (!poIdentifier) return;
        
        const selectedPO = purchaseOrders.find(po => 
            String(po.po_number) === String(poIdentifier) || 
            String(po.customer_po_number) === String(poIdentifier) || 
            String(po.id) === String(poIdentifier)
        );

        if (selectedPO) {
            // Ambil item dari berbagai kemungkinan nama properti (items, detail, product_items, dll)
            const rawItems = selectedPO.items || selectedPO.details || selectedPO.product_items || [];
            
            const formattedItems = rawItems.length > 0 ? rawItems.map(i => ({
                part_number: i.part_number || i.code || i.product_code || '',
                description: i.description || i.name || i.item_name || '',
                qty: Number(i.qty || i.quantity || 1),
                unit_price: Number(i.unit_price || i.price || i.cost || 0)
            })) : [{ part_number: '', description: '', qty: 1, unit_price: 0 }];

            setFormData({
                ...formData,
                po_reference: selectedPO.po_number || selectedPO.customer_po_number || poIdentifier,
                supplier_name: selectedPO.customer_name || selectedPO.supplier_name || selectedPO.vendor_name || '',
                supplier_address: selectedPO.customer_address || selectedPO.supplier_address || 'Jakarta',
                items: formattedItems
            });
        }
    };

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
        setFormData({ ...formData, items: updatedItems });
    };

    const resetForm = () => setFormData({
        invoice_number: `PI-${Math.floor(100000 + Math.random() * 900000)}`,
        po_reference: '',
        supplier_name: '',
        supplier_address: 'Jakarta',
        date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{ part_number: '', description: '', qty: 1, unit_price: 0 }],
    });

    const handleSubmitInvoice = async (e) => {
        e.preventDefault();
        try {
            let calculatedSubTotal = 0;
            const formattedItems = formData.items.map((item) => {
                const amount = Number(item.qty) * Number(item.unit_price);
                calculatedSubTotal += amount;
                return {
                    part_number: item.part_number || 'PART-GENERAL',
                    description: item.description,
                    qty: Number(item.qty),
                    unit: 'PCS',
                    unit_price: Number(item.unit_price),
                    amount: amount,
                };
            });

            const taxAmount = calculatedSubTotal * 0.11;
            const grandTotal = calculatedSubTotal + taxAmount;

            const newInvoice = {
                id: Date.now(),
                invoice_number: formData.invoice_number,
                po_reference: formData.po_reference,
                supplier_name: formData.supplier_name,
                supplier_address: formData.supplier_address,
                date: formData.date,
                due_date: formData.due_date,
                sub_total: calculatedSubTotal,
                tax_amount: taxAmount,
                grand_total: grandTotal,
                items: formattedItems,
                status: 'Belum Lunas'
            };

            const existingLocal = JSON.parse(localStorage.getItem('aldigens_purchase_invoices') || '[]');
            const updatedList = [newInvoice, ...existingLocal];
            localStorage.setItem('aldigens_purchase_invoices', JSON.stringify(updatedList));

            swalSuccess('Berhasil', 'Purchase Invoice berhasil dibuat!');
            setIsModalOpen(false);
            resetForm();
            fetchInvoices();
        } catch (error) {
            swalError('Gagal Menyimpan', 'Periksa kembali inputan Anda.');
        }
    };

    const handleMarkAsPaid = async (id) => {
        const ok = await swalConfirm({
            title: 'Lunasi Invoice?',
            text: 'Status invoice akan diubah menjadi Lunas (Dibayar).',
            confirmText: 'Ya, Lunas',
            cancelText: 'Batal',
            icon: 'question',
        });
        if (!ok) return;

        const updated = invoices.map(inv => inv.id === id ? { ...inv, status: 'Lunas' } : inv);
        setInvoices(updated);
        localStorage.setItem('aldigens_purchase_invoices', JSON.stringify(updated));
        swalSuccess('Berhasil', 'Status invoice diperbarui menjadi Lunas.');
    };

    if (loading) return <div className="p-6 text-slate-600">Memuat data Purchase Invoice...</div>;

    return (
        <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Purchase Invoice (Faktur Pembelian)</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition cursor-pointer"
                >
                    <PlusCircle className="h-4 w-4" />
                    <span>Buat Invoice Baru</span>
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                    <thead className="bg-gray-50 dark:bg-slate-900">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. Invoice / Supplier</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ref. PO</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Tagihan</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {pagination.paginatedItems.length > 0 ? (
                            pagination.paginatedItems.map((inv, idx) => (
                                <tr key={inv.id || idx}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-slate-100">
                                        {inv.invoice_number} <br/><span className="text-xs text-slate-500">{inv.supplier_name}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{inv.po_reference || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-slate-900 dark:text-white">
                                        IDR {Number(inv.grand_total || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                        <span className={`px-2 inline-flex text-xs font-semibold rounded-full ${inv.status === 'Lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                            {inv.status || 'Belum Lunas'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                                        {inv.status !== 'Lunas' && (
                                            <button
                                                onClick={() => handleMarkAsPaid(inv.id)}
                                                className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded transition cursor-pointer"
                                            >
                                                Tandai Lunas
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan="5" className="px-6 py-4 text-center text-sm text-slate-500">Belum ada data Purchase Invoice.</td></tr>
                        )}
                    </tbody>
                </table>
                <Pagination currentPage={pagination.currentPage} totalItems={pagination.totalItems} pageSize={pagination.pageSize} onPageChange={pagination.setCurrentPage} onPageSizeChange={pagination.setPageSize} />
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">Buat Purchase Invoice (Faktur Pembelian)</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSubmitInvoice} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Ambil Data dari Purchase Order (Opsional)</label>
                                <select
                                    onChange={(e) => handleSelectPO(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                >
                                    <option value="">-- Pilih PO untuk Tarik Otomatis --</option>
                                    {purchaseOrders.map((po, idx) => (
                                        <option key={idx} value={po.po_number || po.customer_po_number || po.id}>
                                            {po.po_number || po.customer_po_number || `PO ID: ${po.id}`} — {po.customer_name || po.supplier_name || 'Supplier'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nomor Invoice</label>
                                    <input type="text" required value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nama Supplier</label>
                                    <input type="text" required placeholder="Nama supplier" value={formData.supplier_name} onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Tanggal Invoice</label>
                                    <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Jatuh Tempo (Due Date)</label>
                                    <input type="date" required value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                                </div>
                            </div>

                            <div className="border-t border-slate-200 pt-4 mt-2">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold text-sm text-slate-700">Daftar Item Tagihan</h4>
                                    <button type="button" onClick={handleAddItem} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1 cursor-pointer">
                                        <Plus className="h-3.5 w-3.5" /><span>Tambah Baris</span>
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
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Part Number</label>
                                                    <input type="text" required value={item.part_number} onChange={(e) => handleItemChange(index, 'part_number', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Deskripsi</label>
                                                    <input type="text" required value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">QTY</label>
                                                    <input type="number" min="1" required value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Harga Satuan (IDR)</label>
                                                    <input type="number" min="0" required value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 cursor-pointer">Batal</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer">Simpan Invoice</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}