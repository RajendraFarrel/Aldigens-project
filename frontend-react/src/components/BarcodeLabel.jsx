import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

/**
 * Menampilkan gambar barcode (Code128) dari sebuah nilai.
 * Props:
 *  - value  : string yang akan dijadikan barcode (kode produk / barcode)
 *  - height : tinggi barcode dalam px (default 60)
 *  - width  : lebar per modul bar (default 2)
 *  - displayValue : tampilkan teks di bawah barcode (default true)
 *  - fontSize : ukuran font teks (default 14)
 */
export default function BarcodeLabel({
  value,
  height = 60,
  width = 2,
  displayValue = true,
  fontSize = 14,
  className = '',
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, String(value), {
        format: 'CODE128',
        width,
        height,
        displayValue,
        fontSize,
        margin: 6,
        lineColor: '#0f172a',
      });
    } catch (e) {
      // Nilai tidak valid untuk CODE128 (mis. karakter non-ASCII)
      console.error('Gagal membuat barcode:', e);
    }
  }, [value, height, width, displayValue, fontSize]);

  if (!value) return null;

  return <svg ref={svgRef} className={className} />;
}

/**
 * Membuka jendela cetak baru yang berisi satu/lebih label barcode.
 * @param {Array<{name:string, code:string, part_number?:string, unit?:string}>} products
 */
export function printBarcodes(products) {
  const items = (products || []).filter((p) => p && (p.barcode || p.product_code));
  if (items.length === 0) return;

  const win = window.open('', '_blank', 'width=800,height=600');
  if (!win) {
    alert('Popup diblokir. Izinkan popup untuk mencetak barcode.');
    return;
  }

  // Buat SVG barcode untuk setiap produk memakai JsBarcode secara sinkron
  const labels = items
    .map((p) => {
      const code = p.barcode || p.product_code;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      try {
        JsBarcode(svg, String(code), {
          format: 'CODE128',
          width: 2,
          height: 70,
          displayValue: true,
          fontSize: 14,
          margin: 6,
        });
      } catch (e) {
        console.error('Gagal membuat barcode untuk', code, e);
      }
      return `
        <div class="label">
          <div class="name">${escapeHtml(p.name || '-')}</div>
          <div class="part">${escapeHtml(p.part_number || '')}</div>
          ${svg.outerHTML}
          <div class="unit">${escapeHtml(p.unit || '')}</div>
        </div>`;
    })
    .join('');

  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Cetak Barcode</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 12px; }
          .grid { display: flex; flex-wrap: wrap; gap: 10px; }
          .label {
            width: 260px;
            border: 1px dashed #cbd5e1;
            border-radius: 8px;
            padding: 10px 8px;
            text-align: center;
            page-break-inside: avoid;
          }
          .label .name { font-size: 13px; font-weight: bold; color: #0f172a; margin-bottom: 2px; }
          .label .part { font-size: 11px; color: #64748b; margin-bottom: 4px; min-height: 14px; }
          .label svg { max-width: 100%; }
          .label .unit { font-size: 11px; color: #64748b; margin-top: 2px; }
          @media print {
            .label { border: none; }
          }
        </style>
      </head>
      <body>
        <div class="grid">${labels}</div>
        <script>
          window.onload = function () {
            window.focus();
            window.print();
          };
        <\/script>
      </body>
    </html>
  `);
  win.document.close();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
