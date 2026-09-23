import React, { useEffect, useState } from 'react';
import api from '../services/api'; // Sesuaikan path import api.js kamu
import { swalConfirm, swalSuccess, swalError } from '../utils/swal';

export default function POList() {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);

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
            <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-white">Daftar Purchase Order (PO)</h2>

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
        </div>
    );
}