import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

export default function Commissioning() {
    const [commissionings, setCommissionings] = useState([]);
    const [customersList, setCustomersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const pagination = usePagination(commissionings, 10);
    
    // State untuk Cetak BAST
    const [selectedBast, setSelectedBast] = useState(null);

    // Form State
    const [customerId, setCustomerId] = useState('');
    const [projectName, setProjectName] = useState('');
    const [commissioningDate, setCommissioningDate] = useState('');
    const [technicianName, setTechnicianName] = useState('');
    const [notes, setNotes] = useState('');
    
    // Checklist Items State default
    const [items, setItems] = useState([
        { check_item: 'Pemeriksaan Visual & Fisik Material', result: 'LOLOS', remarks: '' },
        { check_item: 'Pengujian Kelistrikan & Panel Kontrol', result: 'LOLOS', remarks: '' },
        { check_item: 'Uji Fungsi Mekanikal / Hidrolik', result: 'LOLOS', remarks: '' },
    ]);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            const headers = { Authorization: `Bearer ${token}` };

            const [commRes, custRes] = await Promise.all([
                axios.get('http://127.0.0.1:8000/api/commissionings', { headers }),
                axios.get('http://127.0.0.1:8000/api/customers', { headers }).catch(() => ({ data: { data: [] } }))
            ]);

            setCommissionings(commRes.data.data || []);
            setCustomersList(custRes.data.data || custRes.data || []);
            setLoading(false);
        } catch (error) {
            console.error('Gagal mengambil data:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddItem = () => {
        setItems([...items, { check_item: '', result: 'LOLOS', remarks: '' }]);
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('auth_token');
            await axios.post('http://127.0.0.1:8000/api/commissionings', {
                customer_id: customerId,
                project_name: projectName,
                commissioning_date: commissioningDate,
                technician_name: technicianName,
                notes: notes,
                items: items
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Data Komisioning & BAST berhasil disimpan!');
            setShowModal(false);
            setCustomerId('');
            setProjectName('');
            setCommissioningDate('');
            setTechnicianName('');
            setNotes('');
            fetchData();
        } catch (error) {
            alert('Gagal menyimpan data. Pastikan semua field terisi dengan benar.');
            console.error(error);
        }
    };

    // Fungsi untuk mengubah status komisioning
    const handleStatusChange = async (id, newStatus) => {
        try {
            const token = localStorage.getItem('auth_token');
            await axios.patch(`http://127.0.0.1:8000/api/commissionings/${id}/status`, {
                status: newStatus
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`Status berhasil diubah menjadi ${newStatus}!`);
            fetchData();
        } catch (error) {
            alert('Gagal memperbarui status.');
            console.error(error);
        }
    };

    const handlePrint = (comm) => {
        setSelectedBast(comm);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    return (
        <div className="p-6">
            {/* Tampilan Normal Web */}
            <div className="print:hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Komisioning & BAST</h1>
                        <p className="text-sm text-slate-500">Manajemen pengujian lapangan dan Berita Acara Serah Terima</p>
                    </div>
                    <button 
                        onClick={() => setShowModal(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition cursor-pointer"
                    >
                        + Buat Komisioning Baru
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b">
                                <th className="p-4">No. Dokumen</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4">Proyek</th>
                                <th className="p-4">Teknisi</th>
                                <th className="p-4">Tanggal</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {loading ? (
                                <tr><td colSpan="7" className="p-4 text-center text-slate-400">Memuat data...</td></tr>
                            ) : pagination.paginatedItems.length === 0 ? (
                                <tr><td colSpan="7" className="p-4 text-center text-slate-400">Belum ada data komisioning.</td></tr>
                            ) : (
                                pagination.paginatedItems.map((comm) => (
                                    <tr key={comm.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-semibold text-slate-700">{comm.commissioning_code}</td>
                                        <td className="p-4">{comm.customer?.customer_name || '-'}</td>
                                        <td className="p-4">{comm.project_name || '-'}</td>
                                        <td className="p-4">{comm.technician_name}</td>
                                        <td className="p-4">{comm.commissioning_date}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                                comm.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                                                comm.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                                                'bg-amber-100 text-amber-800'
                                            }`}>
                                                {comm.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center flex justify-center gap-2">
                                            <button 
                                                onClick={() => handlePrint(comm)}
                                                className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition"
                                            >
                                                Cetak BAST
                                            </button>
                                            {comm.status === 'DRAFT' && (
                                                <button 
                                                    onClick={() => handleStatusChange(comm.id, 'APPROVED')}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition"
                                                >
                                                    Approve
                                                </button>
                                            )}
                                            {comm.status === 'APPROVED' && (
                                                <button 
                                                    onClick={() => handleStatusChange(comm.id, 'COMPLETED')}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition"
                                                >
                                                    Selesaikan
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controller */}
                <Pagination
                    currentPage={pagination.currentPage}
                    totalItems={pagination.totalItems}
                    pageSize={pagination.pageSize}
                    onPageChange={pagination.setCurrentPage}
                    onPageSizeChange={pagination.setPageSize}
                />
            </div>

            {/* Template Khusus Cetak BAST */}
            {selectedBast && (
                <div className="hidden print:block p-8 bg-white text-black font-sans">
                    <div className="text-center border-b-2 border-black pb-4 mb-6">
                        <h2 className="text-xl font-bold uppercase">PT. ALDIGENS PUTERA PERSADA</h2>
                        <p className="text-xs">Sistem Terintegrasi & Fabrikasi Mekanikal Elektrikal</p>
                        <h1 className="text-lg font-bold uppercase mt-4 underline">BERITA ACARA SERAH TERIMA (BAST) & KOMISIONING</h1>
                        <p className="text-xs">No. Dokumen: {selectedBast.commissioning_code}</p>
                    </div>

                    <div className="mb-6 text-sm grid grid-cols-2 gap-4">
                        <div>
                            <p><strong>Nama Customer:</strong> {selectedBast.customer?.customer_name}</p>
                            <p><strong>Nama Proyek:</strong> {selectedBast.project_name || '-'}</p>
                        </div>
                        <div>
                            <p><strong>Tanggal Pengujian:</strong> {selectedBast.commissioning_date}</p>
                            <p><strong>Teknisi Lapangan:</strong> {selectedBast.technician_name}</p>
                        </div>
                    </div>

                    <h3 className="font-bold text-sm mb-2 uppercase">Hasil Checklist Pengujian Lapangan:</h3>
                    <table className="w-full border-collapse border border-black mb-6 text-xs">
                        <thead>
                            <tr className="bg-gray-200">
                                <th className="border border-black p-2 text-center w-10">No</th>
                                <th className="border border-black p-2 text-left">Item Pengujian</th>
                                <th className="border border-black p-2 text-center w-28">Hasil</th>
                                <th className="border border-black p-2 text-left">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedBast.items?.map((item, index) => (
                                <tr key={index}>
                                    <td className="border border-black p-2 text-center">{index + 1}</td>
                                    <td className="border border-black p-2">{item.check_item}</td>
                                    <td className="border border-black p-2 text-center font-bold">{item.result}</td>
                                    <td className="border border-black p-2">{item.remarks || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mb-8 text-sm">
                        <p><strong>Catatan Tambahan:</strong></p>
                        <p className="border border-gray-400 p-2 min-h-[50px] rounded text-xs">{selectedBast.notes || 'Tidak ada catatan khusus.'}</p>
                    </div>

                    <div className="grid grid-cols-2 text-center mt-12 text-sm">
                        <div>
                            <p>Pihak PT Aldigens Putera Persada,</p>
                            <br /><br /><br />
                            <p className="border-b border-black w-48 mx-auto"></p>
                            <p className="mt-1">Teknisi / Supervisor</p>
                        </div>
                        <div>
                            <p>Pihak Customer / Penerima,</p>
                            <br /><br /><br />
                            <p className="border-b border-black w-48 mx-auto"></p>
                            <p className="mt-1">Perwakilan Management</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Form Tambah */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto print:hidden">
                    <div className="bg-white rounded-xl max-w-2xl w-full p-6 my-8 shadow-xl">
                        <h2 className="text-xl font-bold mb-4 text-slate-800">Form Komisioning & Checklist Lapangan</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Pilih Customer</label>
                                    <select 
                                        value={customerId} 
                                        onChange={(e) => setCustomerId(e.target.value)} 
                                        className="w-full border rounded-lg p-2 text-sm bg-white" 
                                        required 
                                    >
                                        <option value="">-- Pilih Customer --</option>
                                        {customersList.map((cust) => (
                                            <option key={cust.id} value={cust.id}>
                                                {cust.customer_name} ({cust.customer_code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Proyek</label>
                                    <input 
                                        type="text" 
                                        placeholder="Nama proyek / unit" 
                                        value={projectName} 
                                        onChange={(e) => setProjectName(e.target.value)} 
                                        className="w-full border rounded-lg p-2 text-sm" 
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tanggal Pengujian</label>
                                    <input 
                                        type="date" 
                                        value={commissioningDate} 
                                        onChange={(e) => setCommissioningDate(e.target.value)} 
                                        className="w-full border rounded-lg p-2 text-sm" 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Nama Teknisi Lapangan</label>
                                    <input 
                                        type="text" 
                                        placeholder="Nama teknisi" 
                                        value={technicianName} 
                                        onChange={(e) => setTechnicianName(e.target.value)} 
                                        className="w-full border rounded-lg p-2 text-sm" 
                                        required 
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-4 mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-slate-700 uppercase">Item Checklist Pengujian</span>
                                    <button type="button" onClick={handleAddItem} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded cursor-pointer">
                                        + Tambah Baris
                                    </button>
                                </div>
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2 items-center">
                                        <input 
                                            type="text" 
                                            placeholder="Item pengujian..." 
                                            value={item.check_item} 
                                            onChange={(e) => handleItemChange(idx, 'check_item', e.target.value)} 
                                            className="flex-1 border rounded p-1.5 text-xs" 
                                            required 
                                        />
                                        <select 
                                            value={item.result} 
                                            onChange={(e) => handleItemChange(idx, 'result', e.target.value)} 
                                            className="border rounded p-1.5 text-xs bg-white"
                                        >
                                            <option value="LOLOS">LOLOS</option>
                                            <option value="TIDAK_LOLOS">TIDAK LOLOS</option>
                                            <option value="NA">N/A</option>
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Catatan Tambahan / BAST</label>
                                <textarea 
                                    value={notes} 
                                    onChange={(e) => setNotes(e.target.value)} 
                                    className="w-full border rounded-lg p-2 text-sm" 
                                    rows="2"
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setShowModal(false)} 
                                    className="px-4 py-2 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300 cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 cursor-pointer"
                                >
                                    Simpan Komisioning
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}