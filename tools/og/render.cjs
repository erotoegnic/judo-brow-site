const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/eroto/Documents/_judo-codex/verify/node_modules/playwright-core');

const root = path.resolve(__dirname, '../..');
async function main() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || 'C:/Users/eroto/.codex/ms-playwright/chromium-1248/chrome-win64/chrome.exe',
    headless: true,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.join(__dirname, 'og.html')).href);
    await page.evaluate(async () => {
      await Promise.all([
        document.fonts.load('500 88px "Noto Serif TC"', '橘豆半永久紋繡高雄前金區預約請洽官方'),
        document.fonts.load('400 48px Allura', 'Taiwan B.Cart'),
        ...Array.from(document.images, image => image.decode()),
      ]);
      await document.fonts.ready;
      for (const family of ['Noto Serif TC', 'Allura']) {
        if (![...document.fonts].some(font => font.family.replaceAll('"', '') === family && font.status === 'loaded')) {
          throw new Error(`Required font not loaded: ${family}`);
        }
      }
    });
    const output = path.join(root, 'assets/og-image.jpg');
    await page.screenshot({ path: output, type: 'jpeg', quality: 85 });
    const image = await page.evaluate(async () => {
      const img = new Image();
      img.src = '../../assets/og-image.jpg';
      await img.decode();
      return { width: img.naturalWidth, height: img.naturalHeight };
    });
    assert.deepEqual(image, { width: 1200, height: 630 });
    const bytes = fs.statSync(output).size;
    assert.ok(bytes < 300000, `Image exceeds 300 KB: ${bytes}`);
    console.log(JSON.stringify({ ...image, bytes, quality: 85, fonts: 'Noto Serif TC + Allura loaded', output }));
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
