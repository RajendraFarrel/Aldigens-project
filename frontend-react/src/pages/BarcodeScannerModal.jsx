import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

export default function BarcodeScannerModal({ onScanSuccess, onClose }) {
  const videoRef = useRef(null);
  const codeReader = useRef(new BrowserMultiFormatReader());
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let isMounted = true;

    codeReader.current
      .decodeFromVideoDevice(null, videoRef.current, (result, err) => {
        if (result && isMounted) {
          onScanSuccess(result.getText()); // Mengirim teks barcode yang berhasil dibaca
          onClose(); // Menutup modal kamera otomatis
        }
      })
      .catch((err) => {
        console.error("Gagal memulai scanner:", err);
        if (isMounted) {
          setErrorMsg("Tidak dapat mengakses kamera. Pastikan izin kamera aktif.");
        }
      });

    // Cleanup saat modal ditutup
    return () => {
      isMounted = false;
      codeReader.current.reset();
    };
  }, [onScanSuccess, onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
      <div className="relative w-full max-w-md p-4 bg-white rounded-lg shadow-lg text-center">
        <h3 className="text-lg font-semibold mb-2">Arahkan Barcode ke Kamera</h3>
        
        {errorMsg ? (
          <p className="text-red-600 text-sm p-4 bg-red-50 rounded mb-4">{errorMsg}</p>
        ) : (
          <div className="relative w-full h-64 bg-black rounded overflow-hidden flex items-center justify-center">
            <video 
              ref={videoRef} 
              className="w-full h-full object-cover" 
            />
          </div>
        )}

        <p className="text-xs text-gray-500 mt-2">
          Posisikan barcode di dalam area bingkai kamera.
        </p>

        <button 
          onClick={onClose} 
          className="mt-4 w-full bg-red-500 text-white py-2 rounded font-medium hover:bg-red-600">
          Tutup Kamera
        </button>
      </div>
    </div>
  );
}