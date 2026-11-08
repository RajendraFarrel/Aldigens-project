// Login + verifikasi halaman Data Barang & Part Number.
export default async function run(page, ui) {
  const out = { consoleErrors: [] };
  page.on('console', (m) => { if (m.type() === 'error') out.consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', (e) => out.consoleErrors.push('PAGEERROR ' + String(e).slice(0, 200)));

  await page.evaluate(() => localStorage.clear());
  await page.goto('http://127.0.0.1:5199/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  const snap = await ui.snapshot();
  const boxes = [...snap.matchAll(/@(e\d+) textbox/g)].map((m) => m[1]);
  const submit = snap.match(/@(e\d+) button "Masuk ke Sistem"/)?.[1];
  if (boxes.length < 2 || !submit) return { error: 'login form not found', snap };
  await ui.fill('@' + boxes[0], 'admin@aldigens.co.id');
  await ui.fill('@' + boxes[1], 'password');
  await ui.click('@' + submit);
  await page.waitForTimeout(7000);
  out.token = await page.evaluate(() => !!localStorage.getItem('auth_token'));

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Inventory')?.click();
  });
  await page.waitForTimeout(1200);
  out.menuClick = await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((n) => n.children.length === 0 && n.textContent.trim() === 'Part Number Data');
    if (!el) return false;
    (el.closest('button, a, li') || el).click();
    return true;
  });
  await page.waitForTimeout(6000);

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
      firstRow: rows[0]?.textContent.split(/\s+/).join(' ').slice(0, 90) || '',
      pager: (document.body.innerText.match(/Menampilkan[^\n]*/) || [''])[0],
      loading: document.body.innerText.includes('Memuat data...'),
    };
  });
  out.tabsKomponen = await readTabs();

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /Produk Jadi/.test(b.textContent) && !/Tambah/.test(b.textContent))?.click();
  });
  await page.waitForTimeout(1500);
  out.tabsFinished = await readTabs();

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) => /Komponen & Barang Satuan/.test(b.textContent))?.click();
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'qa-verify.png' });

  return out;
}
