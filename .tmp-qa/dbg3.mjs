const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' };
const user = { id: 1, name: 'admin', full_name: 'Administrator Sistem', email: 'admin@aldigens.co.id', role: 'Administrator', menu_access: null, permissions: [], is_admin: true };

export default async function run(page) {
  const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
  await page.route('**/api/**', (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS, body: '' });
    if (req.url().includes('/api/login')) return json(route, { token: 'qa-token', user });
    if (req.url().includes('/api/me')) return json(route, user);
    return json(route, { data: [] });
  });

  await page.goto('http://localhost:5174/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForSelector('input[type="text"]', { timeout: 20000 });
  const inputs = page.locator('input');
  await inputs.nth(0).fill('admin@aldigens.co.id');
  await inputs.nth(1).fill('password');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(5000);

  const before = await page.evaluate(() => ({
    aside: !!document.querySelector('aside'),
    asideText: (document.querySelector('aside')?.innerText || '').slice(0, 500),
    storageKeys: Object.keys(localStorage),
    cachedUser: localStorage.getItem('auth_user'),
    activeTab: localStorage.getItem('aldigens_active_tab'),
  }));

  const inv = page.locator('button').filter({ hasText: /^Inventory$/ }).first();
  if (await inv.count()) { await inv.click(); await page.waitForTimeout(800); }

  const after = await page.evaluate(() => ({
    asideText: (document.querySelector('aside')?.innerText || '').slice(0, 1200),
    buttons: [...document.querySelectorAll('aside button')].map((b) => b.innerText.trim()).filter(Boolean).slice(0, 40),
  }));

  return { before, after };
}
