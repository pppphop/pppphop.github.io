'use strict';

async function readRoute(route, pathname) {
  const chunks = [];
  for await (const chunk of route.get(pathname)) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

// Restored reading pages bypass Hexo's layout renderer. Reuse the current
// navigation at build time so their desktop and mobile menus stay in sync.
hexo.extend.filter.register('after_generate', async function restoreReadingNavigation() {
  const home = await readRoute(this.route, 'index.html');
  const start = home.indexOf('<nav id="navbar"');
  const end = home.indexOf('<div id="banner"', start);
  if (start < 0 || end < 0) throw new Error('Cannot locate the blog navigation');
  const navigation = home.slice(start, end);

  for (const pathname of this.route.list()) {
    if (pathname !== '404.html' && !(pathname.startsWith('files/') && pathname.endsWith('.html'))) continue;
    const html = await readRoute(this.route, pathname);
    const updated = html.replace(/<nav id="navbar"[\s\S]*?(?=<div id="banner")/, navigation);
    if (updated !== html) this.route.set(pathname, updated);
  }
});
