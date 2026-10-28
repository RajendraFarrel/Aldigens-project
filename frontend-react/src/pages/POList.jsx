import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { swalConfirm, swalSuccess, swalError } from '../utils/swal';
import { PlusCircle, X, Trash2, Plus, Printer } from 'lucide-react';
import Pagination from '../components/Pagination';
import usePagination from '../hooks/usePagination';
import Select from 'react-select';

// ============================================================
// TEMPLATE CETAK PURCHASE ORDER (meniru layout form PO fisik)
// Logo: file 'LOGO ALDIGENS2.jpeg' harus ada di frontend-react/public
// ============================================================
// Template cetak Purchase Order yang mengikuti layout form PO fisik PT. Aldigens.

const COMPANY = {
    name: 'PT. ALDIGENS PUTERA PERSADA',
    address: ['Ruko Bekasi Mas Blok C-25', 'Jl. Jend. Ahmad Yani, Margajaya', 'Bekasi Selatan - 17141'],
};

// Nama file logo di folder public
const LOGO_FILE = 'LOGO ALDIGENS2.jpeg';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ONES = [
    '', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven',
    'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = ['', 'thousand', 'million', 'billion', 'trillion'];

const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Teks multi-baris: escape dulu, lalu ubah enter menjadi <br>
const escLines = (v) => esc(v).replace(/\r?\n/g, '<br/>');

// Tanda "-" dianggap kosong (default form kontak berisi "-")
const clean = (v) => {
    const s = String(v ?? '').trim();
    return s === '-' ? '' : s;
};

const fmtNumber = (n) => Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });

// 2026-09-08 -> 8 Sep 2026
const fmtDate = (value) => {
    if (!value) return '';
    const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(value);
    return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
};

const isYes = (v) => v === true || v === 1 || ['1', 'yes', 'true', 'y'].includes(String(v).toLowerCase());

const below1000 = (num) => {
    const words = [];
    let n = num;
    if (n >= 100) {
        words.push(`${ONES[Math.floor(n / 100)]} hundred`);
        n %= 100;
    }
    if (n >= 20) {
        words.push(TENS[Math.floor(n / 10)]);
        if (n % 10) words.push(ONES[n % 10]);
    } else if (n > 0) {
        words.push(ONES[n]);
    }
    return words.join(' ');
};

// 5930000 -> "Five million nine hundred thirty thousand"
const numberToWordsEn = (value) => {
    let n = Math.floor(Math.abs(Number(value) || 0));
    if (n === 0) return 'Zero';
    const chunks = [];
    let scale = 0;
    while (n > 0) {
        const chunk = n % 1000;
        if (chunk) chunks.unshift(`${below1000(chunk)}${SCALES[scale] ? ` ${SCALES[scale]}` : ''}`);
        n = Math.floor(n / 1000);
        scale += 1;
    }
    const text = chunks.join(' ');
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const STYLE = `
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: Tahoma, Verdana, Arial, sans-serif; font-size: 10px; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 10mm 12mm; }
    .box { border: 1px solid #444; border-radius: 6px; }

    .top { display: flex; gap: 16px; align-items: flex-start; }
    .top-left { flex: 0 0 62%; }
    .top-right { flex: 1; }
    .company { margin-left: 62px; }
    .company .name { font-weight: 700; padding: 4px 8px; border-bottom: 1px solid #444; }
    .company .addr { padding: 4px 8px; line-height: 1.4; }
    .party { display: flex; margin-top: 8px; }
    .party .lbl { flex: 0 0 62px; text-align: right; padding: 4px 8px 0 0; }
    .party .box { flex: 1; padding: 5px 8px; min-height: 44px; line-height: 1.45; }
    .party .contact { margin-top: 10px; }

    .title { text-align: right; font-size: 24px; margin: 0 0 6px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; border: 1px solid #444; border-radius: 6px; overflow: hidden; }
    .meta .cell { padding: 3px 6px 5px; min-height: 36px; }
    .meta .cell:nth-child(odd) { border-right: 1px solid #444; }
    .meta .cell:nth-child(-n+6) { border-bottom: 1px solid #444; }
    .meta .k { font-size: 9px; }
    .meta .v { text-align: center; margin-top: 5px; }

    .items { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 10px; }
    .items th { border: 1px solid #444; padding: 3px 4px; font-weight: 400; text-align: center; }
    .items td { border-left: 1px solid #444; border-right: 1px solid #444; padding: 2px 5px; vertical-align: top; word-wrap: break-word; }
    .items tr.fill td { border-bottom: 1px solid #444; }
    .items .r { text-align: right; }

    .bottom { display: flex; gap: 14px; margin-top: 6px; align-items: flex-start; }
    .bottom-left { flex: 0 0 62%; }
    .bottom-right { flex: 1; }
    .words { padding: 6px 8px; min-height: 28px; }
    .desc { position: relative; margin-top: 8px; padding: 10px 8px 6px; min-height: 54px; line-height: 1.4; }
    .desc .cap { position: absolute; top: -7px; left: 10px; background: #fff; padding: 0 4px; }

    .sum { padding: 4px 8px; margin-bottom: 6px; }
    .sum .line { display: flex; padding: 2px 0; }
    .sum .l { flex: 1; text-align: right; padding-right: 14px; }
    .sum .l.left { text-align: left; padding-right: 0; }
    .sum .v { flex: 0 0 38%; text-align: right; }
    .sum.total { font-weight: 700; }

    .sign { display: flex; gap: 10px; margin-top: 10px; }
    .sign .col { flex: 1; }
    .sign .space { min-height: 18mm; }
    /* Logo di pojok kiri atas, sejajar kotak perusahaan. brightness: latar abu-abu muda dibuat putih */
    .logo { width: 58mm; height: auto; display: block; margin: 0 0 3mm 62px; filter: brightness(1.06); }
    .sign .line { border-bottom: 1px solid #444; width: 90%; margin-bottom: 3px; }
`;

function buildPurchaseOrderHtml(po = {}, { autoPrint = false, logoUrl = '' } = {}) {
    const items = Array.isArray(po.items) ? po.items : [];

    // --- Total ---
    const subTotal = Number(po.sub_total ?? items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.unit_price || 0), 0));
    const discount = Number(po.discount ?? po.discount_amount ?? 0);
    const taxPct = Number(po.tax_percentage || 0);
    // Pajak dihitung dari item yang bertanda tax_code "T", sama seperti logika lama
    const taxAmount = Number(
        po.tax_amount ??
            items.reduce((sum, it) => {
                const base = Number(it.qty || 0) * Number(it.unit_price || 0);
                return String(it.tax_code || '').toUpperCase() === 'T' ? sum + base * ((taxPct || 11) / 100) : sum;
            }, 0)
    );
    const freight = Number(po.estimated_freight ?? po.freight ?? 0);
    const total = Number(po.grand_total ?? subTotal - discount + taxAmount + freight);
    const taxLabel = taxPct ? `PPN (${taxPct}%) :` : 'PPN :';

    const hasTaxedItem = items.some((it) => String(it.tax_code || '').toUpperCase() === 'T');
    const taxable = po.vendor_taxable ?? po.is_taxable ?? (hasTaxedItem || taxAmount > 0);
    const taxableText = isYes(taxable) ? 'Yes' : 'No';

    // --- Data vendor & pengiriman ---
    const vendorName = po.customer_name || po.supplier_name || po.vendor_name || '';
    const vendorAddress = po.customer_address || po.supplier_address || '';
    const phone = clean(po.supplier_phone ?? po.customer_phone);
    const fax = clean(po.supplier_fax ?? po.customer_fax);
    const cp = clean(po.contact_person ?? po.supplier_contact ?? po.customer_contact);
    const shipTo = po.ship_to || po.ship_to_address || `${COMPANY.address[0]}\n${COMPANY.address[1]}, ${COMPANY.address[2]}`;

    const meta = [
        ['PO Date', fmtDate(po.date ?? po.po_date)],
        ['PO Number', po.po_number || ''],
        ['Terms', po.terms ?? po.payment_terms ?? ''],
        ['FOB', po.fob ?? po.fob_point ?? ''],
        ['Ship Via', po.ship_via ?? ''],
        ['Expected Date', fmtDate(po.expected_date ?? po.delivery_date)],
        ['Vendor is Taxable', taxableText],
        ['Rate', po.rate ?? po.exchange_rate ?? 1],
    ];

    // --- Baris item ---
    const rows = items
        .map((it) => {
            const qty = Number(it.qty || 0);
            const price = Number(it.unit_price || 0);
            const disc = Number(it.discount_percent ?? it.disc_percent ?? 0);
            const amount = qty * price * (1 - disc / 100);
            return `
                <tr>
                    <td>${esc(it.part_number || '')}</td>
                    <td>${esc(it.description || '')}</td>
                    <td class="r">${fmtNumber(qty)}</td>
                    <td class="r">${fmtNumber(price)}</td>
                    <td class="r">${fmtNumber(disc)}</td>
                    <td>${esc(String(it.tax_code || '').toUpperCase())}</td>
                    <td class="r">${fmtNumber(amount)}</td>
                </tr>`;
        })
        .join('');

    // Baris kosong agar garis kolom memanjang sampai bawah, seperti form asli
    const fillHeightMm = Math.max(0, 108 - items.length * 5);

    // Logo di pojok kiri atas (seperti logo pada form fisik). Disembunyikan jika gambar gagal dimuat.
    const logoBlock = logoUrl
        ? `<img class="logo" src="${esc(logoUrl)}" alt="PT. Aldigens Putera Persada" onerror="this.style.display='none'" />`
        : '';

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <title>Purchase Order ${esc(po.po_number || '')}</title>
    <style>${STYLE}</style>
</head>
<body>
<div class="page">

    <div class="top">
        <div class="top-left">
            ${logoBlock}
            <div class="box company">
                <div class="name">${esc(COMPANY.name)}</div>
                <div class="addr">${COMPANY.address.map(esc).join('<br/>')}</div>
            </div>
            <div class="party">
                <div class="lbl">Vendor :</div>
                <div class="box">
                    <strong>${esc(vendorName)}</strong><br/>
                    ${escLines(vendorAddress)}
                    <div class="contact">T. ${esc(phone)} &nbsp; F. ${esc(fax)} &nbsp; CP. ${esc(cp)}</div>
                </div>
            </div>
            <div class="party">
                <div class="lbl">Ship To :</div>
                <div class="box">${escLines(shipTo)}</div>
            </div>
        </div>
        <div class="top-right">
            <div class="title">Purchase Order</div>
            <div class="meta">
                ${meta.map(([k, v]) => `<div class="cell"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('')}
            </div>
        </div>
    </div>

    <table class="items">
        <colgroup>
            <col style="width:18%" /><col style="width:33%" /><col style="width:9%" />
            <col style="width:13%" /><col style="width:6%" /><col style="width:4%" /><col style="width:17%" />
        </colgroup>
        <thead>
            <tr><th>Item</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Disc %</th><th>Tax</th><th>Amount</th></tr>
        </thead>
        <tbody>
            ${rows}
            <tr class="fill"><td style="height:${fillHeightMm}mm"></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        </tbody>
    </table>

    <div class="bottom">
        <div class="bottom-left">
            <div class="box words">${esc(numberToWordsEn(total))}</div>
            <div class="box desc">
                <span class="cap">Description</span>
                ${escLines(po.subject ?? po.notes ?? po.description ?? '')}
            </div>
            <div class="sign">
                <div class="col">
                    <div>Prepared By</div>
                    <div class="space"></div>
                    <div class="line"></div>
                    <div>Date:</div>
                </div>
                <div class="col">
                    <div>Approved By</div>
                    <div class="space"></div>
                    <div class="line"></div>
                    <div>Date:</div>
                </div>
            </div>
        </div>
        <div class="bottom-right">
            <div class="box sum">
                <div class="line"><span class="l">Sub Total :</span><span class="v">${fmtNumber(subTotal)}</span></div>
                <div class="line"><span class="l">Discount :</span><span class="v">${fmtNumber(discount)}</span></div>
            </div>
            <div class="box sum">
                <div class="line"><span class="l">${esc(taxLabel)}</span><span class="v">${fmtNumber(taxAmount)}</span></div>
            </div>
            <div class="box sum">
                <div class="line"><span class="l left">Estimated Freight</span><span class="v">${fmtNumber(freight)}</span></div>
            </div>
            <div class="box sum total">
                <div class="line"><span class="l left">Total Order :</span><span class="v">${fmtNumber(total)}</span></div>
            </div>
        </div>
    </div>

</div>
${autoPrint ? '<script>window.onload = function () { window.focus(); setTimeout(function () { window.print(); }, 500); };</script>' : ''}
</body>
</html>`;
}

function printPurchaseOrder(po) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Pop-up diblokir browser. Izinkan pop-up untuk mencetak PO.');
        return;
    }
    // File logo harus ada di folder frontend-react/public
    const logoUrl = `${window.location.origin}/${encodeURI(LOGO_FILE)}`;
    printWindow.document.write(buildPurchaseOrderHtml(po, { autoPrint: true, logoUrl }));
    printWindow.document.close();
}


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
        terms: 'FOB',
        ship_via: '',
        tax_percentage: 11,
        items: [{ product_id: null, part_number: '', description: '', qty: 1, unit: 'PCS', unit_price: 0, tax_code: '' }],
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
        } catch {
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
                return;
            }
        } catch (err) {
            const localParts = JSON.parse(localStorage.getItem('aldigens_products') || localStorage.getItem('aldigens_customer_part_numbers') || '[]');
            setInventoryItems(localParts);
        }

        const localProducts = JSON.parse(localStorage.getItem('aldigens_products') || '[]');
        const localInventory = JSON.parse(localStorage.getItem('aldigens_inventory') || '[]');
        const localCustomerParts = JSON.parse(localStorage.getItem('aldigens_customer_part_numbers') || '[]');
        
        const combined = [...localProducts, ...localInventory, ...localCustomerParts];
        const uniqueItems = Array.from(new Map(combined.map(item => [item.part_number || item.product_code || item.id, item])).values());

        setInventoryItems(uniqueItems);
    };

    const productOptions = inventoryItems.map((inv) => ({
        value: inv.id || inv.part_number,
        label: `${inv.part_number || inv.product_code} — ${inv.name || inv.description}`,
        description: inv.name || inv.description || '',
        part_number: inv.part_number || inv.product_code || '',
        raw: inv,
    }));

    const calculatedSubTotal = formData.items.reduce((acc, item) => {
        return acc + (Number(item.qty || 0) * Number(item.unit_price || 0));
    }, 0);

    const numericTaxPercent = Number(formData.tax_percentage || 0);

    const calculatedTaxAmount = formData.items.reduce((acc, item) => {
        const itemSubtotal = Number(item.qty || 0) * Number(item.unit_price || 0);
        if (item.tax_code && item.tax_code.toUpperCase() === 'T') {
            return acc + Math.round(itemSubtotal * (numericTaxPercent / 100));
        }
        return acc;
    }, 0);

    const calculatedGrandTotal = calculatedSubTotal + calculatedTaxAmount;

    const handleAddItem = () => {
        setFormData({ ...formData, items: [...formData.items, { product_id: null, part_number: '', description: '', qty: 1, unit: 'PCS', unit_price: 0, tax_code: '' }] });
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
        po_number: '',
        date: new Date().toISOString().split('T')[0],
        supplier_name: '',
        supplier_address: 'Jakarta',
        supplier_phone: '-',
        supplier_email: '-',
        subject: '',
        terms: 'FOB',
        ship_via: '',
        tax_percentage: 11,
        items: [{ product_id: null, part_number: '', description: '', qty: 1, unit: 'PCS', unit_price: 0, tax_code: '' }],
    });

    const handleSubmitNewPO = async (e) => {
        e.preventDefault();
        try {
            const formattedItems = formData.items.map((item) => {
                const amount = Number(item.qty) * Number(item.unit_price);
                return {
                    product_id: item.product_id ?? null,
                    part_number: item.part_number || 'PART-GENERAL',
                    description: item.description,
                    qty: Number(item.qty),
                    unit: item.unit || 'PCS',
                    unit_price: Number(item.unit_price),
                    amount: amount,
                    tax_code: item.tax_code ? item.tax_code.toUpperCase() : null,
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
                terms: formData.terms,
                ship_via: formData.ship_via,
                sub_total: calculatedSubTotal,
                tax_amount: calculatedTaxAmount,
                tax_percentage: numericTaxPercent,
                grand_total: calculatedGrandTotal,
                items: formattedItems,
                status: 'Pending'
            };

            try {
                await api.post('/purchase-orders', newPOItem);
            } catch {
                console.log('Disimpan ke local storage.');
            }

            const existingLocal = JSON.parse(localStorage.getItem('aldigens_purchase_orders') || '[]');
            const updatedList = [newPOItem, ...existingLocal];
            localStorage.setItem('aldigens_purchase_orders', JSON.stringify(updatedList));

            swalSuccess('Berhasil', 'Purchase Order baru berhasil dibuat!');
            setIsModalOpen(false);
            resetForm();
            fetchPurchaseOrders();
        } catch {
            swalError('Gagal Menyimpan', 'Periksa kembali inputan Anda.');
        }
    };

    const handleConvertToReceiveItem = async (id) => {
        const ok = await swalConfirm({
            title: 'Proses ke Receive Item (RI)?',
            text: 'PO ini akan diterima di gudang dan otomatis mencatat stok masuk ke Database Laravel.',
            confirmText: 'Ya, Terima Barang',
            cancelText: 'Batal',
            icon: 'question',
        });
        if (!ok) return;

        try {
            const targetPO = purchaseOrders.find(po => po.id === id || po.po_number === id);

            if (targetPO) {
                const poItems = targetPO.items || [];

                const payload = {
                    receiveNo: `RI-${Math.floor(100000 + Math.random() * 900000)}`,
                    date: new Date().toISOString().split('T')[0],
                    vendorName: targetPO.customer_name || targetPO.supplier_name || targetPO.vendor_name || 'Supplier Umum',
                    vendor_name: targetPO.customer_name || targetPO.supplier_name || targetPO.vendor_name || 'Supplier Umum',
                    supplier_name: targetPO.customer_name || targetPO.supplier_name || targetPO.vendor_name || 'Supplier Umum',
                    poRef: targetPO.po_number || targetPO.customer_po_number,
                    status: 'Completed',
                    notes: `PO Ref: ${targetPO.po_number || 'PO'} | Vendor: ${targetPO.customer_name || targetPO.supplier_name || 'Supplier Umum'}`,
                    items: poItems.map(item => ({
                        part_number: item.part_number || '',
                        description: item.description || '',
                        qty: Number(item.qty || item.quantity || 1),
                        unit: item.unit || 'PCS'
                    }))
                };

                await api.post('/receive-items', payload);
            }

            const updated = purchaseOrders.map(po => {
                if (po.id === id || po.po_number === id) {
                    return { ...po, status: 'Received (RI)' };
                }
                return po;
            });
            setPurchaseOrders(updated);
            localStorage.setItem('aldigens_purchase_orders', JSON.stringify(updated));

            swalSuccess('Berhasil', 'Barang diterima dan rincian item masuk ke Receive Item!');
            fetchPurchaseOrders();
       } catch (error) {
            console.error(error);
            const errorMsg = error.response?.data?.message || 'Terjadi kesalahan saat memproses penerimaan barang.';
            swalError('Gagal', errorMsg);
        }
    };

    // Template cetak PO ada di bagian printPurchaseOrder di atas file ini
    const handlePrintPO = (po) => printPurchaseOrder(po);

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
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                            po.status?.includes('Received') || po.status?.includes('Completed') || po.status === 'Sudah Diterima'
                                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                        }`}>
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
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden border border-slate-700 my-8">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950">
                            <h3 className="font-bold text-white text-lg">Input Purchase Order (PO) ke Supplier</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"><X className="h-5 w-5" /></button>
                        </div>
                        <form onSubmit={handleSubmitNewPO} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nomor PO</label>
                                    <input type="text" required placeholder="Contoh: PO-2026-001" value={formData.po_number} onChange={(e) => setFormData({ ...formData, po_number: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Tanggal PO</label>
                                    <input type="date" required value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Nama Supplier / Vendor</label>
                                    <input type="text" required placeholder="Contoh: PT. Sumber Baja Perkasa" value={formData.supplier_name} onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Subjek / Proyek</label>
                                    <input type="text" required placeholder="Contoh: Pengadaan Material" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Alamat Supplier</label>
                                <input type="text" required placeholder="Alamat lengkap supplier" value={formData.supplier_address} onChange={(e) => setFormData({ ...formData, supplier_address: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Terms (Ketentuan)</label>
                                    <input type="text" placeholder="Contoh: FOB, COD, Net 30" value={formData.terms} onChange={(e) => setFormData({ ...formData, terms: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Ship Via (Pengiriman)</label>
                                    <input type="text" placeholder="Contoh: Kurir Internal, Ekspedisi" value={formData.ship_via} onChange={(e) => setFormData({ ...formData, ship_via: e.target.value })} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm" />
                                </div>
                            </div>

                            <div className="border-t border-slate-800 pt-4 mt-2">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-semibold text-sm text-slate-300">Daftar Item / Part Number</h4>
                                    <button type="button" onClick={handleAddItem} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1 cursor-pointer">
                                        <Plus className="h-3.5 w-3.5" /><span>Tambah Baris Item</span>
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {formData.items.map((item, index) => (
                                        <div key={index} className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl space-y-3 relative">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-slate-400">Item #{index + 1}</span>
                                                {formData.items.length > 1 && (
                                                    <button type="button" onClick={() => handleRemoveItem(index)} className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div style={{ position: 'relative', zIndex: (formData.items.length - index) * 10 }}>
                                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Pilih Part Number / Inventory</label>
                                                    <Select
                                                        options={productOptions}
                                                        value={productOptions.find(opt => opt.value === item.product_id || opt.part_number === item.part_number) || null}
                                                        onChange={(selectedOption) => {
                                                            const updatedItems = [...formData.items];
                                                            if (selectedOption) {
                                                                updatedItems[index].product_id = selectedOption.value;
                                                                updatedItems[index].part_number = selectedOption.part_number;
                                                                updatedItems[index].description = selectedOption.description;
                                                                updatedItems[index].unit = selectedOption.raw.unit || 'PCS';
                                                            } else {
                                                                updatedItems[index].product_id = null;
                                                                updatedItems[index].part_number = '';
                                                                updatedItems[index].description = '';
                                                                updatedItems[index].unit = 'PCS';
                                                            }
                                                            setFormData({ ...formData, items: updatedItems });
                                                        }}
                                                        placeholder="Cari & Pilih Part Number..."
                                                        isSearchable={true}
                                                        isClearable={true}
                                                        className="text-sm"
                                                        styles={{
                                                            control: (provided, state) => ({
                                                                ...provided,
                                                                backgroundColor: '#1e293b',
                                                                borderColor: state.isFocused ? '#3b82f6' : '#334155',
                                                                borderRadius: '0.5rem',
                                                                padding: '2px',
                                                                boxShadow: 'none',
                                                                '&:hover': { borderColor: '#64748b' }
                                                            }),
                                                            menu: (provided) => ({
                                                                ...provided,
                                                                backgroundColor: '#1e293b',
                                                                borderRadius: '0.5rem',
                                                                border: '1px solid #334155',
                                                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                                                                zIndex: 9999
                                                            }),
                                                            option: (provided, state) => ({
                                                                ...provided,
                                                                backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#334155' : '#1e293b',
                                                                color: '#ffffff',
                                                                cursor: 'pointer',
                                                                fontSize: '0.875rem',
                                                            }),
                                                            singleValue: (provided) => ({
                                                                ...provided,
                                                                color: '#ffffff',
                                                            }),
                                                            input: (provided) => ({
                                                                ...provided,
                                                                color: '#ffffff',
                                                            }),
                                                            placeholder: (provided) => ({
                                                                ...provided,
                                                                color: '#94a3b8',
                                                            }),
                                                        }}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Deskripsi / Spesifikasi</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        placeholder="Deskripsi barang"
                                                        value={item.description}
                                                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-4 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Kuantitas (QTY)</label>
                                                    <input type="number" min="1" required value={item.qty} onChange={(e) => handleItemChange(index, 'qty', e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Satuan (Unit)</label>
                                                    <select value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm">
                                                        <option value="PCS">PCS</option>
                                                        <option value="KG">KG</option>
                                                        <option value="SET">SET</option>
                                                        <option value="METER">METER</option>
                                                        <option value="LITER">LITER</option>
                                                        <option value="BOX">BOX</option>
                                                        <option value="UNIT">UNIT</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Harga Satuan (IDR)</label>
                                                    <input type="number" min="0" required placeholder="0" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)} className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-emerald-400 uppercase mb-1 text-center">Pajak (Ketik T)</label>
                                                    <input 
                                                        type="text" 
                                                        maxLength="1" 
                                                        placeholder="T" 
                                                        value={item.tax_code || ''} 
                                                        onChange={(e) => handleItemChange(index, 'tax_code', e.target.value)} 
                                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm text-center font-bold uppercase placeholder-slate-600 focus:border-emerald-500 outline-none" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-xl space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-400 font-medium">Sub Total:</span>
                                    <span className="font-bold text-white">Rp {calculatedSubTotal.toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-700 pt-3">
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-semibold text-slate-300">PPN (%):</label>
                                        <div className="flex gap-1">
                                            <button type="button" onClick={() => setFormData({ ...formData, tax_percentage: 11 })} className="px-2 py-0.5 text-xs bg-blue-900/60 text-blue-300 border border-blue-700 rounded hover:bg-blue-800 cursor-pointer">11%</button>
                                            <button type="button" onClick={() => setFormData({ ...formData, tax_percentage: 0 })} className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 cursor-pointer">0%</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <input 
                                            type="number" 
                                            min="0"
                                            max="100"
                                            placeholder="0" 
                                            value={formData.tax_percentage} 
                                            onChange={(e) => setFormData({ ...formData, tax_percentage: e.target.value === '' ? 0 : Number(e.target.value)} )} 
                                            className="w-20 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-center font-bold text-white"
                                        />
                                        <span className="text-sm font-medium text-slate-400 w-32 text-right">
                                            (+ Rp {calculatedTaxAmount.toLocaleString('id-ID')})
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between text-base border-t border-slate-700 pt-3">
                                    <span className="font-bold text-white">Grand Total:</span>
                                    <span className="font-extrabold text-blue-400">Rp {calculatedGrandTotal.toLocaleString('id-ID')}</span>
                                </div>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-slate-800">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-800 cursor-pointer">Batal</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium cursor-pointer">Simpan PO</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
