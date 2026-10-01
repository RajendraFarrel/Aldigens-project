import React from 'react';

/** Kop dokumen untuk hasil cetak modul akuntansi. */
export default function PrintHeader({ judul, periode, perusahaan = 'PT. ALDIGENS PUTERA PERSADA' }) {
  return (
    <div className="hidden print:block mb-4">
      <div className="text-center border-b-2 border-slate-800 pb-2">
        <h1 className="text-lg font-bold uppercase tracking-wide">{perusahaan}</h1>
        <p className="text-xs">Jl. Raya Industri No. 88, Jakarta Timur</p>
        <h2 className="text-base font-bold mt-2 underline">{judul}</h2>
        {periode ? <p className="text-xs mt-0.5">Periode: {periode}</p> : null}
      </div>
    </div>
  );
}
