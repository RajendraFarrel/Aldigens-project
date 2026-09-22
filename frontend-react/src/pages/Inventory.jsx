import React, { useState, useEffect, useRef } from 'react';
import BarcodeScannerModal from './BarcodeScannerModal';
import JsBarcode from 'jsbarcode';
import axios from 'axios';

export default function Inventory() {
  // State untuk mengatur sub-menu/tab aktif: 'data', 'scan', atau 'rekap'
  const [activeTab, setActiveTab] = useState('data');
  const [inventories, setInventories] = useState([]);
  const [scanCode, setScanCode] = useState('');
  const [scanType, setScanType] = useState('in'); // 'in' atau 'out'
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  
  // State untuk kontrol Modal Kamera & Modal Print Barcode
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [selectedBarcode, setSelectedBarcode] = useState(null);
  const barcodeRef = useRef(null);

  // Ambil data inventaris dari API Laravel (menggunakan IP jaringan / localhost sesuai setup Anda)
  const fetchInventories = async () => {
    try {
      const response = await axios.get('http://192.168.2.207:8000/api/inventories');
      setInventories(response.data.data || response.data);
    } catch (error) {
      console.error('Gagal memuat data inventaris', error);
    }
  };

  useEffect(() => {
    fetchInventories();
  }, []);

  // Render barcode ke canvas saat modal cetak dibuka
  useEffect(() => {
    if (selectedBarcode && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, selectedBarcode, {
          format: "CODE128",
          lineColor: "#000",
          width: 2,
          height: 60,
          displayValue: true
        });
      } catch (e) {
        console.error("Gagal generate barcode:", e);
      }
    }
  }, [selectedBarcode]);

  // Handle Scan Barcode (Submit via teks/scanner fisik)
  const handleScanSubmit = async (codeToProcess, typeToProcess) => {
    if (!codeToProcess) return;

    setLoading(true);
    try {
      const response = await axios.post(`http://192.168.2.207:8000/api/inventories/scan/${codeToProcess}/update-stock`, {
        type: typeToProcess,
        quantity: 1
      });
      setScanResult({
        success: true,
        message: response.data.message,
        data: response.data.data
      });
      setScanCode('');
      fetchInventories();
    } catch (error) {
      setScanResult({
        success: false,
        message: error.response?.data?.message || 'Terjadi kesalahan saat scan.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleScanSubmit(scanCode, scanType);
  };

  // Callback ketika kamera berhasil membaca barcode
  const handleCameraScanSuccess = (scannedText) => {
    setScanCode(scannedText);
    handleScanSubmit(scannedText, scanType);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Manajemen Inventaris</h1>

      {/* Sub-menu / Tab Navigasi */}
      <div className="flex gap-2 mb-6 border-b pb-3">
        <button
          onClick={() => setActiveTab('data')}
          className={`px-4 py-2 rounded font-medium transition-all ${
            activeTab === 'data' ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Data Inventaris
        </button>
        <button
          onClick={() => setActiveTab('scan')}
          className={`px-4 py-2 rounded font-medium transition-all ${
            activeTab === 'scan' ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Scan Barcode
        </button>
        <button
          onClick={() => setActiveTab('rekap')}
          className={`px-4 py-2 rounded font-medium transition-all ${
            activeTab === 'rekap' ? 'bg-blue-600 text-white shadow' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Rekap Barang
        </button>
      </div>

      {/* Konten Tab 1: Data Inventaris */}
      {activeTab === 'data' && (
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Daftar Stok Barang</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="p-3">Part Number</th>
                  <th className="p-3">Nama Barang</th>
                  <th className="p-3">Kategori</th>
                  <th className="p-3">Stok</th>
                  <th className="p-3">Harga Jual</th>
                  <th className="p-3 text-center">Aksi Barcode</th>
                </tr>
              </thead>
              <tbody>
                {inventories.length > 0 ? (
                  inventories.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono">{item.part_number}</td>
                      <td className="p-3">{item.item_name}</td>
                      <td className="p-3">{item.category || '-'}</td>
                      <td className="p-3 font-bold">{item.stock_quantity} {item.unit}</td>
                      <td className="p-3">Rp {Number(item.selling_price).toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setSelectedBarcode(item.part_number)}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 font-medium"
                        >
                          Cetak Barcode
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="text-center p-4 text-gray-500">Belum ada data inventaris.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Konten Tab 2: Scan Barcode */}
      {activeTab === 'scan' && (
        <div className="bg-white rounded shadow p-6 max-w-xl">
          <h2 className="text-lg font-semibold mb-4">Form Scan Barcode (Barang Masuk / Keluar)</h2>
          
          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scanType"
                value="in"
                checked={scanType === 'in'}
                onChange={() => setScanType('in')}
              />
              <span className="font-medium text-green-600">Barang Masuk (+)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scanType"
                value="out"
                checked={scanType === 'out'}
                onChange={() => setScanType('out')}
              />
              <span className="font-medium text-red-600">Barang Keluar (-)</span>
            </label>
          </div>

          <form onSubmit={handleFormSubmit} className="flex gap-3">
            <input
              type="text"
              placeholder="Scan atau ketik Part Number..."
              value={scanCode}
              onChange={(e) => setScanCode(e.target.value)}
              className="border p-2 rounded flex-1"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded font-medium hover:bg-purple-700"
            >
              Buka Kamera
            </button>
            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-5 py-2 rounded font-medium">
              {loading ? 'Memproses...' : 'Proses'}
            </button>
          </form>

          {/* Notifikasi Hasil Scan */}
          {scanResult && (
            <div className={`mt-4 p-4 rounded ${scanResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              <p className="font-semibold">{scanResult.message}</p>
              {scanResult.data && (
                <p className="text-sm mt-1">
                  Barang: <strong>{scanResult.data.item_name}</strong> | Stok Terbaru: <strong>{scanResult.data.stock_quantity} {scanResult.data.unit}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Konten Tab 3: Rekap Barang */}
      {activeTab === 'rekap' && (
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-3">Rekapitulasi Barang</h2>
          <p className="text-gray-600 mb-4">Ringkasan total jenis barang dan valuasi stok gudang saat ini.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 p-4 rounded">
              <p className="text-sm text-blue-600 font-medium">Total Jenis Barang</p>
              <p className="text-2xl font-bold mt-1">{inventories.length} Item</p>
            </div>
            <div className="bg-green-50 border border-green-200 p-4 rounded">
              <p className="text-sm text-green-600 font-medium">Total Keseluruhan Stok</p>
              <p className="text-2xl font-bold mt-1">
                {inventories.reduce((acc, curr) => acc + (curr.stock_quantity || 0), 0)} Pcs
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Scanner Kamera */}
      {isScannerOpen && (
        <BarcodeScannerModal
          onScanSuccess={handleCameraScanSuccess}
          onClose={() => setIsScannerOpen(false)}
        />
      )}

      {/* Modal Preview & Print Barcode */}
      {selectedBarcode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-sm w-full">
            <h3 className="font-semibold text-lg mb-2">Label Barcode Barang</h3>
            <div className="my-4 p-4 border border-dashed rounded flex justify-center bg-gray-50">
              <canvas ref={barcodeRef} />
            </div>
            <p className="text-xs text-gray-500 mb-4">Part Number: {selectedBarcode}</p>
            
            <div className="flex justify-center gap-2">
              <button 
                onClick={() => window.print()}
                className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700">
                Print Barcode
              </button>
              <button 
                onClick={() => setSelectedBarcode(null)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded text-sm font-medium hover:bg-gray-400">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}