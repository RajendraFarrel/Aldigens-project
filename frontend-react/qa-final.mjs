// Verifikasi akhir: data termuat, warna tab biru, kedua tab berfungsi.
export default async function run(page) {
  const out = {};

  const readTabs = () => page.evaluate(() => {
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

  out.komponen = await page.evaluate(() => ({
    error: /Gagal memuat data produk/.test(document.body.innerText),
    rows: [...document.querySelectorAll('tbody tr')].filter((r) => r.querySelectorAll('td').length > 1).length,
    pager: (document.body.innerText.match(/Menampilkan[^\n]*/) || [''])[0],
    firstRow: (document.querySelector('tbody tr')?.textContent || '').split(/\s+/).join(' ').slice(0, 100),
  }));
  out.tabsKomponen = await readTabs();

  // Tab Produk Jadi
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /Produk Jadi/.test(b.textContent) && !/Tambah/.test(b.textContent))?.click();
  });
  await page.waitForTimeout(1500);
  out.tabsProdukJadi = await readTabs();
  out.produkJadi = await page.evaluate(() => ({
    rows: [...document.querySelectorAll('tbody tr')].filter((r) => r.querySelectorAll('td').length > 1).length,
    empty: (document.body.innerText.match(/Belum ada Produk Jadi[^\n]*/) || [''])[0],
    addBtn: [...document.querySelectorAll('button')].some((b) => /Tambah Produk Jadi/.test(b.textContent)),
  }));

  // Kembali ke komponen + pagination
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /Komponen & Barang Satuan/.test(b.textContent))?.click();
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const n2 = [...document.querySelectorAll('button')].filter((b) => b.textContent.trim() === '2');
    n2[n2.length - 1]?.click();
  });
  await page.waitForTimeout(1000);
  out.page2 = await page.evaluate(() => ({
    pager: (document.body.innerText.match(/Menampilkan[^\n]*/) || [''])[0],
  }));

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'qa-final.png' });
  return out;
}
