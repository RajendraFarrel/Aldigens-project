// Muat ulang halaman produk dengan cache bust, cek data & warna tab.
export default async function run(page) {
  const out = { logs: [] };
  page.on('pageerror', (e) => out.logs.push('PAGEERROR: ' + (e.stack || String(e)).slice(0, 500)));

  // Pastikan bundel HMR terbaru dipakai (reload keras).
  await page.goto('http://127.0.0.1:5199/', { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Inventory')?.click();
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((n) => n.children.length === 0 && n.textContent.trim() === 'Part Number Data');
    (el?.closest('button, a, li') || el)?.click();
  });
  await page.waitForTimeout(7000);

  out.page = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('tbody tr')].filter((r) => r.querySelectorAll('td').length > 1);
    const errBanner = [...document.querySelectorAll('div')].some(
      (d) => /Gagal memuat data produk/.test(d.textContent || '') && /red/.test(String(d.className))
    );
    return {
      errorBanner: errBanner,
      rowCount: rows.length,
      pager: (document.body.innerText.match(/Menampilkan[^\n]*/) || [''])[0],
      loading: document.body.innerText.includes('Memuat data...'),
      firstRow: rows[0] ? rows[0].textContent.split(/\s+/).join(' ').slice(0, 110) : '',
    };
  });

  out.tabs = await page.evaluate(() => {
    const n = (s) => s.split(/\s+/).join(' ').trim();
    return [...document.querySelectorAll('button')]
      .filter((b) => /Komponen & Barang Satuan|Produk Jadi/.test(b.textContent) && !/Tambah/.test(b.textContent))
      .map((b) => {
        const cs = getComputedStyle(b);
        const badge = b.querySelector('span');
        return {
          text: n(b.textContent),
          color: cs.color,
          weight: cs.fontWeight,
          badgeBg: badge ? getComputedStyle(badge).backgroundColor : null,
          badgeColor: badge ? getComputedStyle(badge).color : null,
        };
      });
  });

  // Cek tab Produk Jadi
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /Produk Jadi/.test(b.textContent) && !/Tambah/.test(b.textContent))?.click();
  });
  await page.waitForTimeout(1800);
  out.finishedTab = await page.evaluate(() => ({
    emptyText: (document.body.innerText.match(/Belum ada Produk Jadi[^\n]*/) || [''])[0],
    rows: [...document.querySelectorAll('tbody tr')].filter((r) => r.querySelectorAll('td').length > 1).length,
  }));

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /Komponen & Barang Satuan/.test(b.textContent))?.click();
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'qa-verify.png' });

  return out;
}
