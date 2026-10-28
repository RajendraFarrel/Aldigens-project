import { useEffect, useState } from 'react';
import api from '../services/api';
import { swalConfirm, swalSuccess, swalError } from '../utils/swal';
import { PlusCircle, X, Trash2, Plus, Printer } from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import logoAldigens from '../../LOGO ALDIGENS2.jpeg';

const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const findSupplierByName = (list, name) => {
    const key = normName(name);
    return key ? list.find((s) => normName(s.supplier_name) === key) : undefined;
};

const NEW_SUPPLIER = '__new__';

const emptyItem = () => ({ part_number: '', description: '', qty: 1, unit_price: 0, discount: 0 });

const emptyForm = () => ({
    supplier_id: '',
    new_supplier_name: '',
    new_supplier_address: '',
    invoice_number: `F-${Math.floor(10000000 + Math.random() * 90000000)}/INV`,
    po_reference: '',
    date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [emptyItem()],
});

function terbilang(nilai) {
    const angka = Math.abs(Number(nilai) || 0);
    if (angka === 0) return 'Nol Rupiah';
    const huruf = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
    const bagi = (n) => {
        if (n < 12) return ' ' + huruf[n];
        if (n < 20) return bagi(n - 10) + ' Belas';
        if (n < 100) return bagi(Math.floor(n / 10)) + ' Puluh' + bagi(n % 10);
        if (n < 200) return ' Seratus' + bagi(n - 100);
        if (n < 1000) return bagi(Math.floor(n / 100)) + ' Ratus' + bagi(n % 100);
        if (n < 2000) return ' Seribu' + bagi(n - 1000);
        if (n < 1000000) return bagi(Math.floor(n / 1000)) + ' Ribu' + bagi(n % 1000);
        if (n < 1000000000) return bagi(Math.floor(n / 1000000)) + ' Juta' + bagi(n % 1000000);
        return '';
    };
    return bagi(angka).trim() + ' Rupiah';
}

export default function PurchaseInvoice() {
    const [invoices, setInvoices] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);

    const pagination = usePagination(invoices, 10);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState(emptyForm);

    useEffect(() => {
        fetchInvoices();
        fetchPurchaseOrders();
        fetchSuppliers();
    }, []);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const response = await api.get('/purchase-invoices');
            const apiData = response?.data?.data || response?.data;
            setInvoices(Array.isArray(apiData) ? apiData : []);
        } catch (error) {
            console.error('Gagal memuat invoice:', error);
            setInvoices([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPurchaseOrders = async () => {
        let allPOs = [];
        try {
            const response = await api.get('/purchase-orders').catch(() => null);
            const apiData = response?.data?.data || response?.data;
            if (Array.isArray(apiData)) {
                allPOs = [...apiData];
            }
        } catch { /* abaikan */ }

        const possibleKeys = ['aldigens_purchase_orders', 'purchase_orders', 'po_list'];
        possibleKeys.forEach(key => {
            const stored = localStorage.getItem(key);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) {
                        allPOs = [...allPOs, ...parsed];
                    }
                } catch { /* abaikan */ }
            }
        });

        const uniquePOs = Array.from(new Map(allPOs.map(po => [po.po_number || po.customer_po_number || po.id, po])).values());
        setPurchaseOrders(uniquePOs);
    };

    const fetchSuppliers = async () => {
        try {
            const response = await api.get('/suppliers');
            const apiData = response?.data?.data || response?.data;
            const list = Array.isArray(apiData) ? apiData : [];
            setSuppliers(list);
            return list;
        } catch (error) {
            console.error('Gagal memuat supplier:', error);
            return [];
        }
    };

    const registerSupplier = async (name, address) => {
        const latest = await fetchSuppliers();
        const existing = findSupplierByName(latest, name);
        if (existing) return existing.id;

        const maxNo = latest.reduce((max, s) => {
            const m = String(s.supplier_code || '').match(/(\d+)$/);
            return m ? Math.max(max, Number(m[1])) : max;
        }, 0);
        const codes = [`SUP-${String(maxNo + 1).padStart(3, '0')}`, `SUP-${String(Date.now()).slice(-6)}`];

        let lastError;
        for (const code of codes) {
            try {
                const res = await api.post('/suppliers', {
                    supplier_code: code,
                    supplier_name: name,
                    address: address || null,
                    status: 'AKTIF',
                });
                const created = res?.data?.data ?? res?.data;
                await fetchSuppliers();
                return created?.id;
            } catch (error) {
                lastError = error;
            }
        }
        throw lastError;
    };

    const handleSelectPO = (poIdentifier) => {
        if (!poIdentifier) {
            setFormData({ ...formData, po_reference: '' });
            return;
        }

        const selectedPO = purchaseOrders.find(po =>
            String(po.po_number) === String(poIdentifier) ||
            String(po.customer_po_number) === String(poIdentifier) ||
            String(po.id) === String(poIdentifier)
        );

        if (selectedPO) {
            const rawItems = selectedPO.items || selectedPO.details || selectedPO.product_items || [];

            const formattedItems = rawItems.length > 0 ? rawItems.map(i => ({
                part_number: i.part_number || i.code || i.product_code || '',
                description: i.description || i.name || i.item_name || '',
                qty: Number(i.qty || i.quantity || 1),
                unit_price: Number(i.unit_price || i.price || i.cost || 0),
                discount: Number(i.discount || 0)
            })) : [emptyItem()];

            const supName = selectedPO.customer_name || selectedPO.supplier_name || selectedPO.vendor_name || '';
            const supAddress = selectedPO.customer_address || selectedPO.supplier_address || '';
            const matchedSupplier = findSupplierByName(suppliers, supName);

            setFormData({
                ...formData,
                po_reference: selectedPO.po_number || selectedPO.customer_po_number || poIdentifier,
                supplier_id: matchedSupplier ? String(matchedSupplier.id) : '',
                new_supplier_name: matchedSupplier ? '' : supName,
                new_supplier_address: matchedSupplier ? '' : supAddress,
                items: formattedItems
            });
        }
    };

    const handleSelectSupplier = (value) => {
        if (value === NEW_SUPPLIER) return;
        setFormData({ ...formData, supplier_id: value, new_supplier_name: '', new_supplier_address: '' });
    };

    const handleAddItem = () => {
        setFormData({ ...formData, items: [...formData.items, emptyItem()] });
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

    const resetForm = () => setFormData(emptyForm());

    const handleSubmitInvoice = async (e) => {
        e.preventDefault();
        try {
            let supplierId = Number(formData.supplier_id);
            if (!supplierId && formData.new_supplier_name) {
                supplierId = Number(await registerSupplier(formData.new_supplier_name, formData.new_supplier_address));
            }
            if (!supplierId) {
                swalError('Supplier belum dipilih', 'Pilih supplier atau pilih PO terlebih dahulu.');
                return;
            }

            const payload = {
                supplier_id: supplierId,
                supplier_invoice_number: formData.invoice_number,
                invoice_date: formData.date,
                due_date: formData.due_date,
                tax_percentage: 11,
                debit_account_id: 1,
                notes: `Reff PO. No. : ${formData.po_reference || '-'}`,
                items: formData.items.map(item => ({
                    part_number: item.part_number || null,
                    description: item.description,
                    qty: Number(item.qty),
                    unit: 'PCS',
                    unit_price: Number(item.unit_price)
                }))
            };

            await api.post('/purchase-invoices', payload);

            swalSuccess('Berhasil', 'Purchase Invoice berhasil disimpan ke database!');
            setIsModalOpen(false);
            resetForm();
            fetchInvoices();
        } catch (error) {
            console.error(error);
            swalError('Gagal Menyimpan', error.response?.data?.message || 'Periksa kembali inputan Anda.');
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
        swalSuccess('Berhasil', 'Status invoice diperbarui menjadi Lunas.');
    };

    // Fungsi cetak persis layout Accurate sesuai foto
    const handlePrintInvoice = (inv) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const itemsList = inv.items || inv.details || [];
        const subtotal = itemsList.reduce((acc, curr) => {
            const qty = Number(curr.qty || 0);
            const price = Number(curr.unit_price || curr.price || 0);
            const disc = Number(curr.discount || 0);
            return acc + ((qty * price) * (1 - disc / 100));
        }, 0);
        const ppn = Number(inv.tax_amount || 0); // PPN 0 atau sesuai data
        const grandTotal = Number(inv.grand_total || (subtotal + ppn));

        const supplierName = inv.supplier?.supplier_name || inv.supplier_name || '-';
        const supplierAddress = inv.supplier?.address || inv.supplier_address || '-';
        const invoiceDate = inv.invoice_date || inv.date || '-';
        const refPo = inv.po_reference || inv.notes || '-';

        printWindow.document.write(`
            <html>
                <head>
                    <title>Invoice - ${inv.invoice_number}</title>
                    <style>
                        body { font-family: Arial, sans-serif; font-size: 11px; color: #000; margin: 0; padding: 20px; background: #fff; }
                        .container { width: 100%; max-width: 800px; margin: 0 auto; }
                        
                        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
                        .header-table td { vertical-align: top; }
                        
                        .logo-box { margin-bottom: 8px; }
                        .logo-img { height: 40px; width: auto; object-fit: contain; }

                        .company-box { font-size: 10px; line-height: 1.4; margin-bottom: 15px; }
                        
                        .invoice-title-area { text-align: right; }
                        .invoice-heading { font-size: 20px; font-weight: bold; letter-spacing: 2px; margin-bottom: 8px; }
                        .invoice-meta { font-size: 11px; line-height: 1.5; text-align: right; }

                        .customer-box { border: 1px solid #000; padding: 8px 10px; margin-bottom: 15px; font-size: 11px; line-height: 1.4; min-height: 55px; }
                        .customer-label { margin-bottom: 2px; color: #333; }

                        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
                        .items-table th, .items-table td { border: 1px solid #000; padding: 6px 8px; font-size: 11px; }
                        .items-table th { background-color: #f8fafc; text-align: center; font-weight: bold; }
                        
                        .text-center { text-align: center; }
                        .text-right { text-align: right; }
                        .text-left { text-align: left; }

                        .row-space { height: 200px; vertical-align: top; }

                        .summary-section { width: 100%; border-collapse: collapse; border-left: 1px solid #000; border-right: 1px solid #000; border-bottom: 1px solid #000; }
                        .summary-section td { vertical-align: top; padding: 8px 10px; }
                        
                        .terbilang-box { font-style: italic; font-size: 11px; margin-bottom: 15px; }
                        .bank-info { font-size: 10px; line-height: 1.4; }
                        
                        .totals-table { width: 100%; border-collapse: collapse; }
                        .totals-table td { padding: 4px 6px; font-size: 11px; border: none; }
                        .totals-table tr td:last-child { text-align: right; width: 110px; }

                        .signature-section { width: 100%; margin-top: 30px; border-collapse: collapse; }
                        .signature-section td { vertical-align: top; width: 50%; font-size: 11px; }
                        .signature-space { height: 50px; }
                        .sign-name { font-weight: bold; text-decoration: underline; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <table class="header-table">
                            <tr>
                                <td style="width: 50%;">
                                    <div class="logo-box">
                                        <img src="${logoAldigens}" class="logo-img" alt="Logo" />
                                    </div>
                                    <div class="company-box">
                                        <strong>PT. ALDIGENS PUTERA PERSADA</strong><br/>
                                        Ruko Bekasi Mas Blok C-25<br/>
                                        Jl. Jend Ahmad Yani, Margajaya<br/>
                                        Bekasi Selatan - 17141
                                    </div>
                                </td>
                                <td style="width: 50%;" class="invoice-title-area">
                                    <div class="invoice-heading">INVOICE</div>
                                    <div class="invoice-meta">
                                        Tanggal : ${invoiceDate}<br/>
                                        Term Pembayaran : Net 30<br/>
                                        Reff PO. No. : ${refPo}<br/>
                                        Mata Uang : Rupiah
                                    </div>
                                </td>
                            </tr>
                        </table>

                        <div class="customer-box">
                            <div class="customer-label">Pelanggan :</div>
                            <strong>${supplierName}</strong><br/>
                            <span>${supplierAddress}</span>
                        </div>

                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th style="width: 5%;">No.</th>
                                    <th style="width: 23%;">Kode Barang</th>
                                    <th style="width: 32%;">Nama Barang</th>
                                    <th style="width: 7%;">Qty</th>
                                    <th style="width: 13%;">Harga @</th>
                                    <th style="width: 8%;">Disc %</th>
                                    <th style="width: 12%;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsList.length > 0 ? itemsList.map((item, idx) => {
                                    const q = Number(item.qty || 0);
                                    const p = Number(item.unit_price || item.price || 0);
                                    const disc = Number(item.discount || 0);
                                    const totalItem = (q * p) * (1 - disc / 100);
                                    return `
                                        <tr>
                                            <td class="text-center row-space">${idx + 1}</td>
                                            <td class="row-space">${item.part_number || '-'}</td>
                                            <td class="row-space">${item.description || '-'}</td>
                                            <td class="text-center row-space">${q}</td>
                                            <td class="text-right row-space">${p.toLocaleString('id-ID', { minimumFractionDigits: 0 })}</td>
                                            <td class="text-center row-space">${disc}</td>
                                            <td class="text-right row-space">${totalItem.toLocaleString('id-ID', { minimumFractionDigits: 0 })}</td>
                                        </tr>
                                    `;
                                }).join('') : `
                                    <tr>
                                        <td colspan="7" class="text-center row-space">Tidak ada item.</td>
                                    </tr>
                                `}
                            </tbody>
                        </table>

                        <table class="summary-section">
                            <tr>
                                <td style="width: 55%;">
                                    <div class="terbilang-box">(${terbilang(grandTotal)})</div>
                                    <div class="bank-info">
                                        Mohon Pembayaran dilakukan ke Account kami sbb :<br/>
                                        Nama Account &nbsp;: PT. ALDIGENS PUTERA PERSADA<br/>
                                        Nama Bank &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: BANK PERMATA<br/>
                                        Account No &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: [Nomor Rekening]
                                    </div>
                                </td>
                                <td style="width: 45%;">
                                    <table class="totals-table">
                                        <tr>
                                            <td>Sub Total</td>
                                            <td>${subtotal.toLocaleString('id-ID', { minimumFractionDigits: 0 })}</td>
                                        </tr>
                                        <tr>
                                            <td>PPN 11%</td>
                                            <td>${ppn.toLocaleString('id-ID', { minimumFractionDigits: 0 })}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>TOTAL</strong></td>
                                            <td><strong>${grandTotal.toLocaleString('id-ID', { minimumFractionDigits: 0 })}</strong></td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>

                        <table class="signature-section">
                            <tr>
                                <td>
                                    PT. ALDIGENS PUTERA PERSADA
                                    <div class="signature-space"></div>
                                    <div class="sign-name">KHAFID YUSUF</div>
                                    <div>Direktur</div>
                                </td>
                                <td></td>
                            </tr>
                        </table>
                    </div>
                    <script>window.onload = function() { setTimeout(() => { window.print(); }, 500); }</script>
                </body>
            </html>
        `);
        printWindow.document.close();
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
                    <PlusCircle className="h-4 w-4"/>
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
                                        {inv.invoice_number} <br/><span className="text-xs text-slate-500">{inv.supplier?.supplier_name || '-'}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{inv.notes || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-slate-900 dark:text-white">
                                        IDR {Number(inv.grand_total || 0).toLocaleString('id-ID')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                            inv.status === 'Lunas' || inv.status === 'PAID'
                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                        }`}>
                                            {inv.status || 'UNPAID'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => handlePrintInvoice(inv)}
                                            className="text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded transition cursor-pointer inline-flex items-center gap-1"
                                            title="Cetak Invoice"
                                        >
                                            <Printer className="h-3.5 w-3.5"/> Cetak
                                        </button>
                                        {inv.status !== 'Lunas' && inv.status !== 'PAID' && (
                                            <button
                                                onClick={() => handleMarkAsPaid(inv.id)}
                                                className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded transition cursor-pointer"
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
                <Pagination currentPage="{pagination.currentPage}" onPageChange="{pagination.setCurrentPage}" onPageSizeChange="{pagination.setPageSize}" pageSize="{pagination.pageSize}" totalItems="{pagination.totalItems}"/>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">Buat Purchase Invoice (Faktur Pembelian)</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"><X className="h-5 w-5"/></button>
                        </div>
                        <form onSubmit={handleSubmitInvoice} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Ambil Data dari Purchase Order (Opsional)</label>
                                <select
                                    value={formData.po_reference}
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
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Pilih Supplier</label>
                                    <select
                                        required
                                        value={formData.supplier_id || (formData.new_supplier_name ? NEW_SUPPLIER : '')}
                                        onChange={(e) => handleSelectSupplier(e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
                                    >
                                        <option value="">-- Pilih Supplier yang Terdaftar --</option>
                                        {formData.new_supplier_name && (
                                            <option value={NEW_SUPPLIER}>{formData.new_supplier_name} (dari PO)</option>
                                        )}
                                        {suppliers.map((sup) => (
                                            <option key={sup.id} value={sup.id}>{sup.supplier_name}</option>
                                        ))}
                                    </select>
                                    {formData.new_supplier_name && (
                                        <p className="text-xs text-amber-600 mt-1">
                                            Supplier &quot;{formData.new_supplier_name}&quot; belum ada di Master Data, akan otomatis didaftarkan saat invoice disimpan.
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nomor Invoice</label>
                                    <input type="text" required value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
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
                                        <Plus className="h-3.5 w-3.5"/><span>Tambah Baris</span>
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 relative">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-500">Item #{index + 1}</span>
                                                {formData.items.length > 1 && (
                                                    <button type="button" onClick={() => handleRemoveItem(index)} className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"><Trash2 className="h-4 w-4"/></button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Kode Barang</label>
                                                    <input type="text" value={item.part_number} onChange={(e) => handleItemChange(index, 'part_number', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Nama Barang</label>
                                                    <input type="text" required value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">QTY</label>
                                                    <input type="number" min="1" required value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Harga Satuan (IDR)</label>
                                                    <input type="number" min="0" required value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Disc %</label>
                                                    <input type="number" min="0" max="100" value={item.discount} onChange={(e) => handleItemChange(index, 'discount', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm" />
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