const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { pathToFileURL } = require('node:url');
const { chromium } = require('C:/Users/eroto/Documents/_judo-codex/verify/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const stage = process.argv[2] || 'after';
const server = http.createServer((req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/\/$/, '/index.html'));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (error, bytes) => {
    if (error) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' })[path.extname(file)] || 'application/octet-stream');
    res.end(bytes);
  });
});
async function main() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch({ executablePath: 'C:/Users/eroto/.codex/ms-playwright/chromium-1248/chrome-win64/chrome.exe', headless: true, args: ['--remote-debugging-port=9231'] });
  try {
    if (process.argv.includes('--qa')) { await require('./browser-qa.cjs')(browser, url); return; }
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    for (const width of [390, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(async () => { await document.fonts.ready; await document.querySelector('.teacher-portrait img').decode(); });
      await page.locator('#cases').scrollIntoViewIfNeeded();
      await page.locator('#case-list img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
      await page.locator('#cases').screenshot({ path: path.join(root, `_screens/cases-${stage}-${width}.png`), style: '.site-header,.floating-line{visibility:hidden!important}' });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: path.join(root, `_screens/seo-${stage}-${width}.png`), fullPage: true });
      await page.locator('#home').screenshot({ path: path.join(root, `_screens/hero-${stage}-${width}.png`) });
    }
    fs.writeFileSync(path.join(root, `_screens/network-${stage}.json`), JSON.stringify(await page.evaluate(() => ({ errors: [], fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => ({ family: f.family, weight: f.weight })), resources: performance.getEntriesByType('resource').map(r => ({ name: r.name, duration: r.duration, transferSize: r.transferSize })), paint: performance.getEntriesByType('paint').map(p => ({ name: p.name, startTime: p.startTime })) })), null, 2));
    console.log('Capture complete', stage, { errors });
    const { default: lighthouse } = await import(pathToFileURL('C:/Users/eroto/AppData/Roaming/npm/node_modules/lighthouse/core/index.js'));
    const result = await lighthouse(url, { port: 9231, output: 'json', logLevel: 'error' }, { extends: 'lighthouse:default', settings: { onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'], formFactor: 'mobile', screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false } } });
    fs.writeFileSync(path.join(root, `_screens/lighthouse-${stage}.json`), JSON.stringify(result.lhr));
    const summary = { stage, scores: Object.fromEntries(Object.entries(result.lhr.categories).map(([key, value]) => [key, Math.round(value.score * 100)])), metrics: Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time', 'total-byte-weight'].map(key => [key, result.lhr.audits[key].displayValue])), errors };
    summary.fonts = result.lhr.audits['network-requests'].details.items.filter(item => item.resourceType === 'Font').map(item => ({ url: item.url, bytes: item.transferSize }));
    summary.fontBytes = summary.fonts.reduce((sum, font) => sum + font.bytes, 0);
    fs.writeFileSync(path.join(root, `_screens/summary-${stage}.json`), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary));
  } finally { await browser.close(); server.close(); }
}
main().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
