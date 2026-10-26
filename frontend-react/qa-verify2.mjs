// Verifikasi halaman Data Barang & Part Number pada sesi yang sudah login.
export default async function run(page) {
  const out = {};

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Inventory')?.click();
  });
  await page.waitForTimeout(1500);
  out.menuClick = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((n) => n.children.length === 0 && n.textContent.trim() === 'Part Number Data');
    if (!el) return false;
    (el.closest('button, a, li') || el).click();
    return true;
  });
  await page.waitForTimeout(7000);

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
          borderBottom: cs.borderBottomColor,
          badgeBg: badge ? getComputedStyle(badge).backgroundColor : null,
          badgeColor: badge ? getComputedStyle(badge).color : null,
        };
      });
  });

  out.page = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('tbody tr')].filter((r) => r.querySelectorAll('td').length > 1);
    const errBanner = [...document.querySelectorAll('div')].some(
      (d) => /Gagal memuat data produk/.test(d.textContent || '') && /red/.test(String(d.className))
    );
    return {
      title: document.querySelector('h2')?.textContent.trim(),
      errorBanner: errBanner,
      rowCount: rows.length,
      firstRow: rows[0] ? rows[0].textContent.split(/\s+/).join(' ').slice(0, 100) : '',
      pager: (document.body.innerText.match(/Menampilkan[^\n]*/) || [''])[0],
      loading: document.body.innerText.includes('Memuat data...'),
    };
  });
  out.tabsKomponen = await readTabs();

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /Produk Jadi/.test(b.textContent) && !/Tambah/.test(b.textContent))?.click();
  });
  await page.waitForTimeout(1800);
  out.tabsFinished = await readTabs();

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /Komponen & Barang Satuan/.test(b.textContent))?.click();
  });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'qa-verify.png' });

  return out;
}
