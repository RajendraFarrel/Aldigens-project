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

  return page.evaluate(async () => {
    const real = await import('/src/config/menus.js?x=1');
    const g = real.MENU_GROUPS;
    const el = document.querySelector('aside nav');
    const key = Object.keys(el).find((k) => k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance'));
    let fiber = el[key];
    const chain = [];
    let depth = 0;
    while (fiber && depth < 12) {
      const name = typeof fiber.type === 'function' ? (fiber.type.name || 'anon') : String(fiber.type);
      let props = null;
      if (fiber.memoizedProps && typeof fiber.memoizedProps === 'object') {
        const p = fiber.memoizedProps;
        props = {
          keys: Object.keys(p).slice(0, 8),
          allowed: Array.isArray(p.allowedMenus) ? p.allowedMenus.length : p.allowedMenus,
          isOpen: p.isOpen,
          activeTab: p.activeTab,
        };
      }
      chain.push({ depth, name, props });
      fiber = fiber.return;
      depth += 1;
    }
    return {
      groupsLength: g.length,
      groupsSample: g.map((x) => x.group),
      fileDiff: document.querySelector('aside nav').outerHTML.length,
      chain,
    };
  });
}
