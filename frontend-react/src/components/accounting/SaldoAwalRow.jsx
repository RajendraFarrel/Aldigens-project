/**
 * Baris "Saldo Awal" pada tabel laporan akuntansi.
 *
 * Nilainya tetap sama dengan yang tampil di layar (rupiah / angka) agar hasil
 * cetak tidak berbeda angka dari layar. Hanya tampilannya yang disamakan dengan
 * dokumen Sales Order: garis atas & bawah tegas, huruf miring, tanpa warna.
 */
export default function SaldoAwalRow({ colSpan, label = 'Saldo Awal', debit, kredit }) {
  return (
    <tr className="bg-slate-50 print:italic font-semibold border-y border-slate-800 print:border-solid">
      <td colSpan={colSpan} className="px-4 py-3 text-right text-xs">{label}</td>
      <td className="px-4 py-3 text-right text-xs whitespace-nowrap">{debit}</td>
      <td className="px-4 py-3 text-right text-xs whitespace-nowrap">{kredit}</td>
    </tr>
  );
}
