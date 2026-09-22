import React, { useEffect, useState } from 'react';
import api from '../services/api'; // Sesuaikan path import api.js kamu

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
    if (!window.confirm("Apakah Anda yakin ingin memproses Purchase Order ini menjadi Sales Order?")) {
        return;
    }

    try {
        const response = await api.post(`/purchase-orders/${id}/convert-to-so`);
        alert(response.data.message || 'Berhasil diproses ke Sales Order!');
        
        // Refresh daftar PO agar statusnya berubah menjadi 'processed_to_so'
        fetchPurchaseOrders(); 
    } catch (error) {
        console.error('Gagal konversi ke SO:', error.response?.data || error.message);
        alert(error.response?.data?.message || 'Terjadi kesalahan saat memproses PO ke SO.');
    }
};

    if (loading) return <div className="p-6">Memuat data Purchase Order...</div>;

    return (
        <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Daftar Purchase Order (PO)</h2>
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">No. PO Klien</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {purchaseOrders.length > 0 ? (
                            purchaseOrders.map((po) => (
                                <tr key={po.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{po.customer_po_number}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{po.po_date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${po.status === 'processed_to_so' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {po.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        {po.status !== 'processed_to_so' ? (
                                            <button 
                                                onClick={() => handleConvertToSO(po.id)}
                                                className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded transition cursor-pointer"
                                            >
                                                Proses ke SO
                                            </button>
                                        ) : (
                                            <span className="text-gray-400 italic">Sudah di-SO</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="px-6 py-4 text-center text-sm text-gray-500">Belum ada data Purchase Order.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}