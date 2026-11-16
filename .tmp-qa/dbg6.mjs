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
  await page.waitForTimeout(6000);

  const mine = await page.evaluate(async () => {
    const m = await import('/src/config/menus.js');
    const u = JSON.parse(localStorage.getItem('auth_user'));
    const allowed = m.getAllowedMenus(u);
    // replicate Sidebar filtering logic
    const groups = m.MENU_GROUPS
      .map((g) => {
        const items = g.items.map((item) => {
          if (item.subItems) return { ...item, subItems: item.subItems.filter((s) => !allowed || allowed.includes(s.key)) };
          return item;
        }).filter((item) => (item.subItems && item.subItems.length > 0) || !allowed || allowed.includes(item.key));
        return { group: g.group, items: items.map((i) => i.label) };
      })
      .filter((g) => g.items.length > 0);
    return { groups, isAdmin: u.role === 'Administrator' };
  });

  const rendered = await page.evaluate(() => [...document.querySelectorAll('aside nav > div > p')].map((p) => p.innerText));
  const paths = await page.evaluate(() => [...performance.getEntriesByType('resource')].map((r) => r.name).filter((n) => n.includes('menus')).slice(0, 5));

  return { mine, rendered, paths };
}
