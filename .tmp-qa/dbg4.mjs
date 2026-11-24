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
  await page.waitForSelector('input[type="text"]', { timeout: 30000 });
  const inputs = page.locator('input');
  await inputs.nth(0).fill('admin@aldigens.co.id');
  await inputs.nth(1).fill('password');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(5000);

  const mods = await page.evaluate(async () => {
    const m = await import('/src/config/menus.js');
    const u = JSON.parse(localStorage.getItem('auth_user'));
    return {
      keys: typeof m.MENU_KEYS,
      groups: m.MENU_GROUPS.length,
      allowed: m.getAllowedMenus(u).slice(0, 6),
      hasReceive: m.getAllowedMenus(u).includes('inventory-receive'),
    };
  }).catch((e) => String(e));

  const inv = page.locator('button').filter({ hasText: /^Inventory$/ }).first();
  const invCount = await inv.count();
  if (invCount) { await inv.click(); await page.waitForTimeout(1200); }

  const after = await page.evaluate(() => ({
    navText: (document.querySelector('aside nav')?.innerText || '').slice(0, 900),
    subButtons: [...document.querySelectorAll('aside nav button')].map((b) => b.innerText.trim()).slice(0, 40),
  }));

  return { mods, invCount, after };
}
