import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';

export default function Commissioning() {
    const [commissionings, setCommissionings] = useState([]);
    const [customersList, setCustomersList] = useState([]);
    const [deliveryOrders, setDeliveryOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const pagination = usePagination(commissionings, 10);
    
    // State untuk Cetak BAST / Installation Report
    const [selectedBast, setSelectedBast] = useState(null);

    // Form State Terintegrasi ERP
    const [doNumber, setDoNumber] = useState('');
    const [soNumber, setSoNumber] = useState('');
    const [refPo, setRefPo] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [unitModel, setUnitModel] = useState('');
    const [serialNo, setSerialNo] = useState('');
    const [installationDate, setInstallationDate] = useState('');
    const [commissioningDate, setCommissioningDate] = useState('');
    const [technicianName, setTechnicianName] = useState('');
    const [notes, setNotes] = useState('');
    
    // Checklist Items State sesuai Standar Template Komisioning/Installation Report
    const [items, setItems] = useState([
        { no: 'A.1', check_item: 'Related Treeway Valve', physical: 'Good', function: 'Good', remarks: '' },
        { no: 'B.1', check_item: 'Seat Belt 2 Point', physical: 'Good', function: 'Good', remarks: '' },
        { no: 'C.1', check_item: 'Bracket Related Treeway Valve', physical: 'Good', function: 'Good', remarks: '' },
        { no: 'C.2', check_item: 'Bracket Seat Belt 2 Point', physical: 'Good', function: 'Good', remarks: '' },
        { no: 'D.1', check_item: 'Wiring Harness Treeway Valve', physical: 'Good', function: 'Good', remarks: '' },
    ]);

    const fetchData = async () => {
        setLoading(true);
        const token = localStorage.getItem('auth_token');
        const headers = { Authorization: `Bearer ${token}` };

        // 1. Tarik Data Commissioning (Dengan Fallback LocalStorage)
        try {
            const commRes = await axios.get('http://127.0.0.1:8000/api/commissionings', { headers });
            const apiComms = commRes.data.data || commRes.data || [];
            const localComms = JSON.parse(localStorage.getItem('aldigens_commissionings') || '[]');
            
            setCommissionings(apiComms.length > 0 ? apiComms : localComms);
        } catch (error) {
            console.warn('API Commissioning gagal, menggunakan LocalStorage.');
            const localComms = JSON.parse(localStorage.getItem('aldigens_commissionings') || '[]');
            setCommissionings(localComms);
        }

        // 2. Tarik Data Customer
        try {
            const custRes = await axios.get('http://127.0.0.1:8000/api/customers', { headers });
            const custData = custRes.data.data || custRes.data.customers || custRes.data || [];
            setCustomersList(Array.isArray(custData) ? custData : []);
        } catch (error) {
            console.error('Gagal mengambil data customer:', error);
            setCustomersList([]);
        }

        // 3. Tarik Data Delivery Order (Gabungan Backend API & LocalStorage)
        try {
            let apiDOs = [];
            try {
                const doRes = await axios.get('http://127.0.0.1:8000/api/delivery-orders', { headers });
                apiDOs = doRes.data.data || doRes.data || [];
            } catch (err) {
                console.warn('API DO belum tersedia, menggunakan data lokal.');
            }
            
            const localDOs = JSON.parse(localStorage.getItem('aldigens_delivery_orders') || '[]');
            const combinedDOs = [...localDOs, ...(Array.isArray(apiDOs) ? apiDOs : [])];
            const uniqueDOs = Array.from(new Map(combinedDOs.map(item => [item.do_number, item])).values());
            
            setDeliveryOrders(uniqueDOs.filter(d => d.status !== 'Cancelled'));
        } catch (error) {
            console.error('Gagal memproses data DO:', error);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- FUNGSI AUTO-FILL DARI DELIVERY ORDER ---
    const handleDoChange = (selectedDoNum) => {
        setDoNumber(selectedDoNum);
        if (!selectedDoNum) {
            setSoNumber('');
            setRefPo('');
            setCustomerId('');
            return;
        }

        const selected = deliveryOrders.find(d => d.do_number === selectedDoNum);
        if (selected) {
            setSoNumber(selected.so_number || '');
            setRefPo(selected.customer_po || selected.ref_po || ''); 
            
            if (selected.customer_id) {
                setCustomerId(selected.customer_id);
            } else if (selected.customer_name) {
                const matchedCust = customersList.find(c => 
                    String(c.id) === String(selected.customer_id) ||
                    (c.customer_name || '').toLowerCase().trim() === (selected.customer_name || '').toLowerCase().trim() ||
                    (c.customer_name || '').toLowerCase().includes((selected.customer_name || '').toLowerCase())
                );
                if (matchedCust) {
                    setCustomerId(matchedCust.id);
                }
            }
        }
    };

    const handleAddItem = () => {
        setItems([...items, { no: `${String.fromCharCode(65 + items.length)}.1`, check_item: '', physical: 'Good', function: 'Good', remarks: '' }]);
    };

    const handleRemoveItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        setDoNumber('');
        setSoNumber('');
        setRefPo('');
        setCustomerId('');
        setUnitModel('');
        setSerialNo('');
        setInstallationDate(new Date().toISOString().split('T')[0]);
        setCommissioningDate(new Date().toISOString().split('T')[0]);
        setTechnicianName('');
        setNotes('');
        setItems([
            { no: 'A.1', check_item: 'Related Treeway Valve', physical: 'Good', function: 'Good', remarks: '' },
            { no: 'B.1', check_item: 'Seat Belt 2 Point', physical: 'Good', function: 'Good', remarks: '' },
            { no: 'C.1', check_item: 'Bracket Related Treeway Valve', physical: 'Good', function: 'Good', remarks: '' },
            { no: 'C.2', check_item: 'Bracket Seat Belt 2 Point', physical: 'Good', function: 'Good', remarks: '' },
            { no: 'D.1', check_item: 'Wiring Harness Treeway Valve', physical: 'Good', function: 'Good', remarks: '' },
        ]);
        setShowModal(true);
    };

    const handleOpenEdit = (comm) => {
        setEditingId(comm.id);
        setDoNumber(comm.do_number || '');
        setSoNumber(comm.so_number || '');
        setRefPo(comm.ref_po || '');
        setCustomerId(comm.customer_id || comm.customer?.id || '');
        setUnitModel(comm.unit_model || comm.unit || comm.model || comm.unit_name || '');
        setSerialNo(comm.serial_no || comm.serial_number || comm.sn || '');
        setInstallationDate(comm.installation_date || '');
        setCommissioningDate(comm.commissioning_date || '');
        setTechnicianName(comm.technician_name || '');
        setNotes(comm.notes || '');
        setItems(comm.items && comm.items.length > 0 ? comm.items : [
            { no: 'A.1', check_item: 'Pemeriksaan Visual & Fisik', physical: 'Good', function: 'Good', remarks: '' }
        ]);
        setShowModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('auth_token');
        const headers = { Authorization: `Bearer ${token}` };

        const selectedCustomerObj = customersList.find(c => String(c.id) === String(customerId));

        const payload = {
            id: editingId || Date.now(),
            commissioning_code: editingId ? (commissionings.find(c => c.id === editingId)?.commissioning_code || 'COMM-001') : 'COMM-' + Math.floor(1000 + Math.random() * 9000),
            do_number: doNumber,
            so_number: soNumber,
            ref_po: refPo,
            customer_id: customerId,
            customer: selectedCustomerObj || { customer_name: 'Customer' },
            unit_model: unitModel,
            serial_no: serialNo,
            installation_date: installationDate,
            commissioning_date: commissioningDate,
            technician_name: technicianName,
            notes: notes,
            items: items,
            status: 'COMPLETED'
        };

        try {
            if (editingId) {
                try {
                    await axios.put(`http://127.0.0.1:8000/api/commissionings/${editingId}`, payload, { headers });
                } catch (apiErr) {
                    console.warn('API update error 500/failed, menggunakan LocalStorage fallback.', apiErr);
                }
                const updatedList = commissionings.map(c => c.id === editingId ? payload : c);
                setCommissionings(updatedList);
                localStorage.setItem('aldigens_commissionings', JSON.stringify(updatedList));
                alert('Data Komisioning berhasil diperbarui!');
            } else {
                try {
                    await axios.post('http://127.0.0.1:8000/api/commissionings', payload, { headers });
                } catch (apiErr) {
                    console.warn('API store error 500/failed, menggunakan LocalStorage fallback.', apiErr);
                }
                const newList = [payload, ...commissionings];
                setCommissionings(newList);
                localStorage.setItem('aldigens_commissionings', JSON.stringify(newList));
                alert('Data Komisioning & Installation Report berhasil disimpan!');
            }
            setShowModal(false);
            setEditingId(null);
            fetchData();
        } catch (error) {
            alert('Gagal menyimpan data. Pastikan semua field terisi dengan benar.');
            console.error(error);
        }
    };

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
            <div className="print:hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Komisioning & Installation Report</h1>
                        <p className="text-sm text-slate-500">Manajemen pengujian unit, fisik, fungsional, dan Berita Acara</p>
                    </div>
                    <button 
                        onClick={handleOpenCreate}
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
                                <th className="p-4">No. DO / No. PO</th>
                                <th className="p-4">Unit Model / S/N</th>
                                <th className="p-4">Teknisi</th>
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
                                        <td className="p-4 font-semibold text-slate-700">{comm.commissioning_code || comm.comm_number}</td>
                                        <td className="p-4">{comm.customer?.customer_name || '-'}</td>
                                        <td className="p-4">
                                            <div className="text-slate-700">DO: {comm.do_number || '-'}</div>
                                            <div className="text-xs text-orange-600 font-medium">PO: {comm.ref_po || '-'}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-slate-700">{comm.unit_model || comm.unit || comm.model || comm.unit_name || '-'}</div>
                                            <div className="text-xs text-slate-400">S/N: {comm.serial_no || comm.serial_number || comm.sn || '-'}</div>
                                        </td>
                                        <td className="p-4">{comm.technician_name}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                                comm.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                                                comm.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                                                'bg-amber-100 text-amber-800'
                                            }`}>
                                                {comm.status || 'COMPLETED'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center flex justify-center gap-2">
                                            <button 
                                                onClick={() => handleOpenEdit(comm)}
                                                className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => handlePrint(comm)}
                                                className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded text-xs font-medium cursor-pointer transition"
                                            >
                                                Cetak Report
                                            </button>
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

            {/* --- TEMPLATE CETAK INSTALLATION REPORT & BAST --- */}
            {selectedBast && (
                <div className="hidden print:block p-8 bg-white text-black font-sans text-xs">
                    <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-4">
                        <div>
                            <h2 className="font-bold text-sm uppercase">PT. ALDIGENS PUTERA PERSADA</h2>
                            <p className="text-[10px]">Jl. Jend Ahmad Yani, Bekasi 17141</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold">No. Dokumen : {selectedBast.commissioning_code || selectedBast.comm_number || '002/08/26/UT/APP'}</p>
                        </div>
                    </div>

                    <div className="text-center font-bold text-sm uppercase mb-4 tracking-wider underline">
                        INSTALLATION & COMMISSIONING REPORT
                    </div>

                    <table className="w-full mb-4 text-xs border-collapse">
                        <tbody>
                            <tr>
                                <td className="py-1 font-semibold w-36">Customer's Name</td>
                                <td className="py-1">: {selectedBast.customer?.customer_name || '-'}</td>
                                <td className="py-1 font-semibold w-36">No. PO</td>
                                <td className="py-1">: {selectedBast.ref_po || '-'}</td>
                            </tr>
                            <tr>
                                <td className="py-1 font-semibold">Unit Model</td>
                                <td className="py-1">: {selectedBast.unit_model || selectedBast.unit || selectedBast.model || '-'}</td>
                                <td className="py-1 font-semibold">Serial No.</td>
                                <td className="py-1">: {selectedBast.serial_no || selectedBast.serial_number || '-'}</td>
                            </tr>
                            <tr>
                                <td className="py-1 font-semibold">Installation Date</td>
                                <td className="py-1">: {selectedBast.installation_date || '-'}</td>
                                <td className="py-1 font-semibold">Commissioning Date</td>
                                <td className="py-1">: {selectedBast.commissioning_date || '-'}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="flex justify-end gap-6 text-[10px] font-bold mb-2">
                        <span>[ V ] Good</span>
                        <span>[ X ] Bad</span>
                        <span>[ - ] Correction Made</span>
                    </div>

                    <table className="w-full border-collapse border border-black mb-4 text-xs">
                        <thead>
                            <tr className="bg-slate-100 text-center">
                                <th className="border border-black p-1.5 w-10">No.</th>
                                <th className="border border-black p-1.5 text-left">Inspection Item</th>
                                <th className="border border-black p-1.5 w-20">Physical Appearance</th>
                                <th className="border border-black p-1.5 w-20">Function</th>
                                <th className="border border-black p-1.5 text-left">Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {selectedBast.items?.map((item, index) => (
                                <tr key={index}>
                                    <td className="border border-black p-1.5 text-center font-semibold">{item.no || index + 1}</td>
                                    <td className="border border-black p-1.5">{item.check_item}</td>
                                    <td className="border border-black p-1.5 text-center font-bold">{item.physical || item.result || 'Good'}</td>
                                    <td className="border border-black p-1.5 text-center font-bold">{item.function || 'Good'}</td>
                                    <td className="border border-black p-1.5">{item.remarks || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <div className="mb-6">
                        <p className="font-semibold mb-1">Customer Comment & Remarks :</p>
                        <div className="border border-black p-2 min-h-[40px] rounded text-[11px]">
                            {selectedBast.notes || 'Unit berfungsi dengan baik dan normal sesuai standar.'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 text-center mt-8 text-xs">
                        <div>
                            <p className="font-semibold">Inspector</p>
                            <br /><br /><br />
                            <p className="border-b border-black w-48 mx-auto"></p>
                            <p className="mt-1 font-bold">( {selectedBast.technician_name} )</p>
                            <p className="text-[10px]">PT Aldigens Putera Persada</p>
                        </div>
                        <div>
                            <p className="font-semibold">Customer Approval</p>
                            <br /><br /><br />
                            <p className="border-b border-black w-48 mx-auto"></p>
                            <p className="mt-1 font-bold">( ........................................ )</p>
                            <p className="text-[10px]">{selectedBast.customer?.customer_name || 'Customer'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MODAL FORM TAMBAH / EDIT --- */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto print:hidden">
                    <div className="bg-white rounded-xl max-w-4xl w-full p-6 my-8 shadow-xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 text-slate-800">
                            {editingId ? 'Edit Komisioning & Report' : 'Form Komisioning & Installation Report'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            
                            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">1. Tarik Data dari DO (Surat Jalan)</label>
                                        <select 
                                            value={doNumber} 
                                            onChange={(e) => handleDoChange(e.target.value)} 
                                            className="w-full border border-blue-300 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">-- Pilih DO --</option>
                                            {deliveryOrders.map(d => (
                                                <option key={d.id || d.do_number} value={d.do_number}>
                                                    {d.do_number} - {d.customer_name || 'Customer'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">2. No. PO Pelanggan (Otomatis)</label>
                                        <input 
                                            type="text" 
                                            value={refPo} 
                                            readOnly 
                                            placeholder="Terisi otomatis dari DO..."
                                            className="w-full border rounded-lg p-2 text-sm bg-slate-100 text-slate-600 font-semibold" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">3. Pilih Customer</label>
                                        <select 
                                            value={customerId} 
                                            onChange={(e) => setCustomerId(e.target.value)} 
                                            className="w-full border border-blue-300 rounded-lg p-2 text-sm bg-white" 
                                            required 
                                        >
                                            <option value="">-- Pilih Customer --</option>
                                            {customersList.map((cust) => (
                                                <option key={cust.id} value={cust.id}>
                                                    {cust.customer_name} ({cust.customer_code || 'CUST'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Unit Model</label>
                                    <input 
                                        type="text" 
                                        placeholder="Contoh: D65P-12 / SY215H" 
                                        value={unitModel} 
                                        onChange={(e) => setUnitModel(e.target.value)} 
                                        className="w-full border rounded-lg p-2 text-sm" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Serial No. (S/N)</label>
                                    <input 
                                        type="text" 
                                        placeholder="Nomor Seri Unit" 
                                        value={serialNo} 
                                        onChange={(e) => setSerialNo(e.target.value)} 
                                        className="w-full border rounded-lg p-2 text-sm" 
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Installation Date</label>
                                    <input 
                                        type="date" 
                                        value={installationDate} 
                                        onChange={(e) => setInstallationDate(e.target.value)} 
                                        className="w-full border rounded-lg p-2 text-sm" 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Commissioning Date</label>
                                    <input 
                                        type="date" 
                                        value={commissioningDate} 
                                        onChange={(e) => setCommissioningDate(e.target.value)} 
                                        className="w-full border rounded-lg p-2 text-sm" 
                                        required 
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Inspector / Teknisi Lapangan</label>
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
                                    <span className="text-xs font-bold text-slate-700 uppercase">Inspection Item Checklist</span>
                                    <button type="button" onClick={handleAddItem} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded cursor-pointer">
                                        + Tambah Baris
                                    </button>
                                </div>
                                {items.map((item, idx) => (
                                    <div key={idx} className="flex gap-2 mb-2 items-center bg-slate-50 p-2 rounded border">
                                        <input 
                                            type="text" 
                                            placeholder="No (Cth: A.1)" 
                                            value={item.no} 
                                            onChange={(e) => handleItemChange(idx, 'no', e.target.value)} 
                                            className="w-20 border rounded p-1.5 text-xs text-center" 
                                        />
                                        <input 
                                            type="text" 
                                            placeholder="Inspection Item..." 
                                            value={item.check_item} 
                                            onChange={(e) => handleItemChange(idx, 'check_item', e.target.value)} 
                                            className="flex-2 border rounded p-1.5 text-xs" 
                                            required 
                                        />
                                        <select 
                                            value={item.physical} 
                                            onChange={(e) => handleItemChange(idx, 'physical', e.target.value)} 
                                            className="border rounded p-1.5 text-xs bg-white w-28 font-bold"
                                        >
                                            <option value="Good">Good [V]</option>
                                            <option value="Bad">Bad [X]</option>
                                            <option value="Fixed">Corrected [-]</option>
                                        </select>
                                        <select 
                                            value={item.function} 
                                            onChange={(e) => handleItemChange(idx, 'function', e.target.value)} 
                                            className="border rounded p-1.5 text-xs bg-white w-28 font-bold"
                                        >
                                            <option value="Good">Good [V]</option>
                                            <option value="Bad">Bad [X]</option>
                                            <option value="Fixed">Corrected [-]</option>
                                        </select>
                                        <input 
                                            type="text" 
                                            placeholder="Remarks..." 
                                            value={item.remarks} 
                                            onChange={(e) => handleItemChange(idx, 'remarks', e.target.value)} 
                                            className="flex-1 border rounded p-1.5 text-xs" 
                                        />
                                        <button type="button" onClick={() => handleRemoveItem(idx)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded text-xs font-bold">
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Customer Comment & Remarks</label>
                                <textarea 
                                    value={notes} 
                                    onChange={(e) => setNotes(e.target.value)} 
                                    className="w-full border rounded-lg p-2 text-sm" 
                                    rows="2"
                                    placeholder="Catatan atau komentar customer..."
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
                                    className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 cursor-pointer font-medium"
                                >
                                    {editingId ? 'Simpan Perubahan' : 'Simpan Komisioning'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}