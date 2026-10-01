import React from 'react';
import { Printer } from 'lucide-react';

/**
 * Tombol 🖨️ Print / Cetak.
 * Menjalankan dialog cetak browser. Area `.print-area` pada halaman yang
 * sedang aktif akan menjadi satu-satunya bagian yang tercetak.
 */
export default function PrintButton({ label = 'Print / Cetak', onClick, className = '' }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (onClick) onClick();
        window.print();
      }}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
        bg-slate-700 text-white hover:bg-slate-800 transition shadow-sm cursor-pointer no-print ${className}`}
    >
      <span aria-hidden="true">🖨️</span>
      <Printer className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
