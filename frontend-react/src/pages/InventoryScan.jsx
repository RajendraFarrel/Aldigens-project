import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScanLine, Plus, Trash2, Send, RefreshCw, CheckCircle, AlertCircle,
  ArrowDownCircle, ArrowUpCircle, Package, Camera, CameraOff, Keyboard,
  SwitchCamera
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { searchProductByCode, createBatchTransaction } from '../services/api';

const CAMERA_ELEMENT_ID = 'barcode-camera-reader';

export default function InventoryScan() {
  const [mode, setMode] = useState('MASUK'); // MASUK | KELUAR
  const [scanInput, setScanInput] = useState('');
  const [items, setItems] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastScanned, setLastScanned] = useState(null);
  const inputRef = useRef(null);

  // Sumber scan: 'camera' | 'manual'
  const [scanSource, setScanSource] = useState('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState('');

  const html5QrRef = useRef(null);
  const lastDecodedRef = useRef({ code: '', time: 0 });
  const itemsRef = useRef(items);

  // Selalu simpan items terbaru agar callback kamera tidak basi
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Auto-focus input scan (hanya saat mode manual)
  useEffect(() => {
    if (scanSource === 'manual') inputRef.current?.focus();
  }, [scanSource]);

  const addScannedCode = useCallback(async (rawCode) => {
    const code = String(rawCode || '').trim();
    if (!code) return;

    setScanning(true);
    setErrorMsg('');
    setLastScanned(null);

    try {
      const res = await searchProductByCode(code);
      const product = res.data.data;

      const current = itemsRef.current;
      const existingIdx = current.findIndex((i) => i.product.id === product.id);
      if (existingIdx >= 0) {
        const updated = [...current];
        updated[existingIdx].quantity += 1;
        setItems(updated);
      } else {
        setItems((prev) => [...prev, { product, quantity: 1 }]);
      }

      setLastScanned({ product, status: 'found' });
      setScanInput('');
    } catch (e) {
      const msg = e.response?.data?.message || `Produk tidak ditemukan untuk kode: ${code}`;
      setLastScanned({ code, status: 'not_found', message: msg });
      setScanInput('');
    } finally {
      setScanning(false);
      if (scanSource === 'manual') setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [scanSource]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleScan(scanInput);
    }
  };

  const updateQty = (idx, qty) => {
    if (qty < 1) return;
    const updated = [...items];
    updated[idx].quantity = qty;
    setItems(updated);
  };

  const removeItem = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (items.length === 0) {
      setErrorMsg('Belum ada barang dalam daftar transaksi.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await createBatchTransaction({
        transaction_type: mode,
        items: items.map((i) => ({
          barcode: i.product.barcode || i.product.product_code,
          quantity: i.quantity,
        })),
      });

      setSuccessMsg(`Transaksi ${mode === 'MASUK' ? 'Barang Masuk' : 'Barang Keluar'} berhasil disimpan!`);
      setItems([]);
      setTimeout(() => {
        setSuccessMsg('');
        inputRef.current?.focus();
      }, 3000);
    } catch (e) {
      setErrorMsg(e.response?.data?.message || 'Gagal menyimpan transaksi.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  // ---------------- KAMERA SCANNER ----------------
  const stopCamera = useCallback(async () => {
    const instance = html5QrRef.current;
    if (!instance) {
      setCameraActive(false);
      return;
    }
    try {
      await instance.stop();
      await instance.clear();
    } catch (e) {
      // abaikan jika kamera memang belum/jeda berjalan
    } finally {
      html5QrRef.current = null;
      setCameraActive(false);
    }
  }, []);

  const startCamera = useCallback(async (cameraId) => {
    setCameraError('');

    // Pastikan elemen target sudah ada di DOM
    const el = document.getElementById(CAMERA_ELEMENT_ID);
    if (!el) {
      setTimeout(() => startCamera(cameraId), 150);
      return;
    }

    // Bersihkan instance lama
    if (html5QrRef.current) {
      await stopCamera();
    }

    const instance = new Html5Qrcode(CAMERA_ELEMENT_ID);
    html5QrRef.current = instance;

    const config = { fps: 10, qrbox: { width: 260, height: 160 } };

    const onDecode = (decodedText) => {
      const now = Date.now();
      const last = lastDecodedRef.current;
      // Cegah pemindaian berulang untuk kode yang sama dalam 1.5 detik
      if (last.code === decodedText && now - last.time < 1500) return;
      lastDecodedRef.current = { code: decodedText, time: now };

      if (navigator.vibrate) navigator.vibrate(80);
      addScannedCode(decodedText);
    };

    try {
      await instance.start(
        cameraId ? { deviceId: { exact: cameraId } } : { facingMode: 'environment' },
        config,
        onDecode,
        () => {} // abaikan error per-frame
      );
      setCameraActive(true);
    } catch (err) {
      console.error('Gagal memulai kamera:', err);
      html5QrRef.current = null;
      setCameraActive(false);
      setCameraError(
        'Tidak dapat mengakses kamera. Pastikan izin kamera diizinkan dan perangkat memiliki kamera.'
      );
    }
  }, [addScannedCode, stopCamera]);

  // Ambil daftar kamera & mulai kamera belakang saat tab kamera aktif
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      if (scanSource !== 'camera') return;

      try {
        const devices = await Html5Qrcode.getCameras();
        if (cancelled) return;
        setCameras(devices || []);

        if (devices && devices.length > 0) {
          // Prioritaskan kamera belakang jika ada
          const back = devices.find((d) => /back|belakang|rear|environment/i.test(d.label));
          const chosenId = activeCameraId || (back ? back.id : devices[0].id);
          setActiveCameraId(chosenId);
          startCamera(chosenId);
        } else {
          setCameraError('Tidak ada kamera yang terdeteksi pada perangkat ini.');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Gagal mendeteksi kamera:', err);
        setCameraError(
          'Tidak dapat mengakses kamera. Pastikan situs diakses via http://localhost atau HTTPS, dan izin kamera diberikan.'
        );
      }
    };

    init();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanSource]);

  const switchCamera = async () => {
    if (cameras.length < 2) return;
    const idx = cameras.findIndex((c) => c.id === activeCameraId);
    const next = cameras[(idx + 1) % cameras.length];
    setActiveCameraId(next.id);
    await stopCamera();
    startCamera(next.id);
  };

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-violet-600 p-2.5 rounded-xl shadow">
          <ScanLine className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Scanner Barcode</h2>
          <p className="text-xs text-slate-500">Scan barang untuk transaksi masuk atau keluar</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-3">
        <button
          onClick={() => setMode('MASUK')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition cursor-pointer border-2 ${
            mode === 'MASUK'
              ? 'bg-emerald-600 border-emerald-600 text-white shadow'
              : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
          }`}
        >
          <ArrowDownCircle className="h-5 w-5" />
          Barang Masuk
        </button>
        <button
          onClick={() => setMode('KELUAR')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition cursor-pointer border-2 ${
            mode === 'KELUAR'
              ? 'bg-rose-600 border-rose-600 text-white shadow'
              : 'bg-white border-slate-200 text-slate-600 hover:border-rose-300'
          }`}
        >
          <ArrowUpCircle className="h-5 w-5" />
          Barang Keluar
        </button>
      </div>

      {/* Sumber Scan Toggle */}
      <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
        <button
          onClick={() => setScanSource('camera')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
            scanSource === 'camera' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Camera className="h-4 w-4" />
          Kamera
        </button>
        <button
          onClick={() => setScanSource('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
            scanSource === 'manual' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Keyboard className="h-4 w-4" />
          Input Manual / Alat Scanner
        </button>
      </div>

      {/* Scan Area */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">

        {/* --- MODE KAMERA --- */}
        {scanSource === 'camera' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Camera className="h-4 w-4 text-violet-500" />
                Arahkan kamera ke barcode produk
              </div>
              <div className="flex items-center gap-2">
                {cameras.length > 1 && (
                  <button
                    onClick={switchCamera}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                    title="Ganti Kamera"
                  >
                    <SwitchCamera className="h-4 w-4" />
                  </button>
                )}
                {cameraActive ? (
                  <button
                    onClick={stopCamera}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-xs font-semibold transition cursor-pointer"
                  >
                    <CameraOff className="h-4 w-4" /> Hentikan
                  </button>
                ) : (
                  <button
                    onClick={() => startCamera(activeCameraId)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 text-xs font-semibold transition cursor-pointer"
                  >
                    <Camera className="h-4 w-4" /> Nyalakan Kamera
                  </button>
                )}
              </div>
            </div>

            <div className="relative bg-slate-900 rounded-2xl overflow-hidden min-h-[240px] flex items-center justify-center">
              <div id={CAMERA_ELEMENT_ID} className="w-full [&_video]:w-full [&_video]:rounded-2xl" />
              {!cameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-sm gap-2 px-6 text-center">
                  <Camera className="h-10 w-10 opacity-40" />
                  <span>Kamera belum aktif. Tekan <strong>Nyalakan Kamera</strong> untuk mulai memindai.</span>
                </div>
              )}
              {cameraActive && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-36 border-2 border-violet-400/80 rounded-xl shadow-[0_0_0_9999px_rgba(15,23,42,0.35)]" />
                </div>
              )}
            </div>

            {cameraError && (
              <div className="flex items-start gap-3 p-3 rounded-xl text-sm bg-red-50 text-red-600 border border-red-200">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>
        )}

        {/* --- MODE MANUAL / ALAT SCANNER --- */}
        {scanSource === 'manual' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <ScanLine className="h-4 w-4 text-violet-500" />
              Scan atau ketik barcode / kode produk
            </div>
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Arahkan scanner ke sini atau ketik kode lalu Enter..."
                className="flex-1 border-2 border-violet-200 focus:border-violet-500 rounded-xl px-4 py-3 text-sm outline-none transition font-mono"
                autoFocus
              />
              <button
                onClick={() => addScannedCode(scanInput)}
                disabled={scanning || !scanInput.trim()}
                className="px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium text-sm flex items-center gap-2 transition disabled:opacity-60 cursor-pointer"
              >
                {scanning ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Tambah
              </button>
            </div>
          </div>
        )}

        {/* Feedback scan terakhir */}
        {lastScanned && (
          <div className={`flex items-start gap-3 p-3 rounded-xl text-sm ${
            lastScanned.status === 'found'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-600 border border-red-200'
          }`}>
            {lastScanned.status === 'found'
              ? <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              : <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            }
            {lastScanned.status === 'found'
              ? <span><strong>{lastScanned.product.name}</strong> ({lastScanned.product.product_code}) berhasil ditambahkan.</span>
              : <span>{lastScanned.message}</span>
            }
          </div>
        )}
      </div>

      {/* Alert messages */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {errorMsg}
        </div>
      )}

      {/* Daftar Item */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <span className="font-semibold text-slate-700 text-sm">
            Daftar Barang ({items.length} item · {totalQty} unit)
          </span>
          {items.length > 0 && (
            <button
              onClick={() => setItems([])}
              className="text-xs text-red-500 hover:text-red-600 transition cursor-pointer"
            >
              Hapus Semua
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-14 text-center text-slate-400 text-sm">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
            Belum ada barang. Scan barcode atau ketik kode produk di atas.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">{item.product.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{item.product.product_code}</p>
                </div>
                <div className="text-xs text-slate-500 hidden sm:block">
                  Stok: <span className={`font-semibold ${item.product.stock <= 0 ? 'text-red-500' : 'text-slate-700'}`}>{item.product.stock}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(idx, item.quantity - 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base flex items-center justify-center transition cursor-pointer"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) => updateQty(idx, parseInt(e.target.value) || 1)}
                    className="w-14 text-center border border-slate-200 rounded-lg py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                  <button
                    onClick={() => updateQty(idx, item.quantity + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-base flex items-center justify-center transition cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem(idx)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
      {items.length > 0 && (
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className={`w-full py-4 rounded-xl font-bold text-white text-base flex items-center justify-center gap-3 transition shadow-lg cursor-pointer ${
            mode === 'MASUK'
              ? 'bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400'
              : 'bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400'
          }`}
        >
          {submitting
            ? <RefreshCw className="h-5 w-5 animate-spin" />
            : <Send className="h-5 w-5" />
          }
          {submitting
            ? 'Menyimpan...'
            : `Simpan ${mode === 'MASUK' ? 'Barang Masuk' : 'Barang Keluar'} (${totalQty} unit)`
          }
        </button>
      )}
    </div>
  );
}
