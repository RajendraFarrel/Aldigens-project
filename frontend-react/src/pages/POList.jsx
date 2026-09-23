import React, { useEffect, useState } from 'react';
import api from '../services/api'; // Sesuaikan path import api.js kamu
import { swalConfirm, swalSuccess, swalError } from '../utils/swal';
import { PlusCircle, X, Trash2, Plus } from 'lucide-react';

export default function POList() {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    // State form Input PO Baru (dipindahkan dari Dashboard)
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

    // Ambil data PO dari backend saat komponen dimuat
    useEffect(() => {
        fetchPurchaseOrders();
    }, []);

    const fetchPurchaseOrders = async () => {
        try {
            const response = await api.get('/purchase-orders');
            setPurchaseOrders(response.data.data || response.data);
        } catch (error) {
            console.error("Gagal memuat data PO:", error);
        } finally {
            setLoading(false);
        }
    };

    // -----------------------------------------------
    // Form Input PO Baru (dipindahkan dari Dashboard)
    // -----------------------------------------------
    const handleAddItem = () => {
        setFormData({ ...formData, items: [...formData.items, { description: '', qty: 1, unit_price: 0 }] });
    };

    const handleRemoveItem = (index) => {
        if (formData.items.length === 1) return; // Sisakan minimal 1 baris
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

            const payload = {
                quotation_number: formData.quotation_number,
                date: formData.date,
                admin_sales: formData.admin_sales,
                customer_name: formData.customer_name,
                customer_address: formData.customer_address,
                attention_person: 'Bpk. / Ibu',
                customer_phone: formData.customer_phone,
                customer_email: formData.customer_email,
                subject: formData.subject,
                currency: 'IDR (Rupiah)',
                place_of_delivery: 'Jakarta',
                terms_of_payment: 'Cash / Transfer',
                terms_of_delivery: 'Franco',
                terms_of_warranty: '1 Bulan',
                sub_total: calculatedSubTotal,
                tax_percentage: 11,
                tax_amount: taxAmount,
                grand_total: grandTotal,
                items: formattedItems,
            };

            await api.post('/quotations', payload);
            swalSuccess('Berhasil', 'PO baru berhasil ditambahkan ke database dengan banyak item!');
            setIsModalOpen(false);
            resetForm();
            fetchPurchaseOrders();
        } catch (error) {
            console.error('Terjadi kesalahan saat menyimpan PO:', error);
            const serverMessage = error.response?.data?.message;
            const validationErrors = error.response?.data?.errors;

            if (error.response?.status === 401) {
                swalError('Sesi Berakhir', 'Sesi login Anda sudah berakhir. Silakan login ulang.');
            } else if (validationErrors) {
                const detail = Object.values(validationErrors).flat().join('\n');
                swalError('Data Ditolak', 'Data ditolak oleh server:\n' + detail);
            } else if (serverMessage) {
                swalError('Gagal Menyimpan', 'Gagal menyimpan data: ' + serverMessage);
            } else {
                swalError('Gagal Menyimpan', 'Gagal menyimpan data, periksa kembali inputan Anda.');
            }
        }
    };

    // Fungsi untuk memproses konversi PO ke SO secara aman menggunakan instance 'api'
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
            const response = await api.post(`/purchase-orders/${id}/convert-to-so`);
            swalSuccess('Berhasil', response.data.message || 'Berhasil diproses ke Sales Order!');

            // Refresh daftar PO agar statusnya berubah menjadi 'processed_to_so'
            fetchPurchaseOrders();
        } catch (error) {
            console.error('Gagal konversi ke SO:', error.response?.data || error.message);
            swalError('Gagal memproses', error.response?.data?.message || 'Terjadi kesalahan saat memproses PO ke SO.');
        }
    };

    if (loading) return <div className="p-6 text-slate-600 dark:text-slate-300">Memuat data Purchase Order...</div>;

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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">No. PO Klien</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Tanggal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                        {purchaseOrders.length > 0 ? (
                            purchaseOrders.map((po) => (
                                <tr key={po.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">{po.customer_po_number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{po.po_date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${po.status === 'processed_to_so' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {po.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        {po.status !== 'processed_to_so' ? (
                                            <button
                                                onClick={() => handleConvertToSO(po.id)}
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
                                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-slate-400">Belum ada data Purchase Order.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Input PO Baru (dipindahkan dari Dashboard) */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">Input Data PO</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
                            >
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
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="text-rose-500 hover:text-rose-700 p-1 transition cursor-pointer"
                                                    >
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
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-xs cursor-pointer"
                                >
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