// Verifikasi akhir: data termuat + warna tab (light & dark).
export default async function run(page) {
  const out = {};

  const loadPage = async () => {
    await page.goto('http://127.0.0.1:5199/', { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(3500);
    await page.evaluate(() => {
      [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Inventory')?.click();
    });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const el = [...document.querySelectorAll('*')].find((n) => n.children.length === 0 && n.textContent.trim() === 'Part Number Data');
      (el?.closest('button, a, li') || el)?.click();
    });
    await page.waitForTimeout(5000);
  };

  const readTabs = () => page.evaluate(() => {
    const n = (s) => s.split(/\s+/).join(' ').trim();
    return [...document.querySelectorAll('button')]
      .filter((b) => /Komponen & Barang Satuan|Produk Jadi/.test(b.textContent) && !/Tambah/.test(b.textContent))
      .map((b) => {
        const cs = getComputedStyle(b);
        const badge = b.querySelector('span');
        return {
          text: n(b.textContent),
          textColor: cs.color,
          bg: cs.backgroundColor,
          badgeBg: badge ? getComputedStyle(badge).backgroundColor : null,
          badgeColor: badge ? getComputedStyle(badge).color : null,
        };
      });
  });

  await loadPage();
  // Pastikan data terbaca (klik refresh bila masih kosong)
  let rows = await page.evaluate(() => [...document.querySelectorAll('tbody tr')].filter((r) => r.querySelectorAll('td').length > 1).length);
  if (rows === 0) {
    await page.evaluate(() => document.querySelector('button[title="Refresh"]')?.click());
    await page.waitForTimeout(5000);
  }

  out.light = {
    error: await page.evaluate(() => /Gagal memuat data produk/.test(document.body.innerText)),
    rows: await page.evaluate(() => [...document.querySelectorAll('tbody tr')].filter((r) => r.querySelectorAll('td').length > 1).length),
    pager: await page.evaluate(() => (document.body.innerText.match(/Menampilkan[^\n]*/) || [''])[0]),
    tabs: await readTabs(),
  };
  await page.screenshot({ path: 'qa-light.png' });

  // Mode gelap
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.waitForTimeout(600);
  out.dark = { tabs: await readTabs() };
  await page.screenshot({ path: 'qa-dark.png' });

  // Tab Produk Jadi
  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /Produk Jadi/.test(b.textContent) && !/Tambah/.test(b.textContent))?.click();
  });
  await page.waitForTimeout(1500);
  out.produkJadi = {
    tabs: await readTabs(),
    empty: await page.evaluate(() => (document.body.innerText.match(/Belum ada Produk Jadi[^\n]*/) || [''])[0]),
  };

  return out;
}
