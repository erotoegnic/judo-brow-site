const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/eroto/Documents/_judo-codex/verify/node_modules/playwright-core');
async function main() {
  const browser = await chromium.launch({ executablePath: 'C:/Users/eroto/.codex/ms-playwright/chromium-1248/chrome-win64/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    const results = [];
    for (const width of [390, 1280]) {
      const files = ['before', 'after'].map(stage => path.resolve(__dirname, `../_screens/hero-${stage}-${width}.png`));
      const sources = files.map(file => `data:image/png;base64,${fs.readFileSync(file).toString('base64')}`);
      const result = await page.evaluate(async sources => {
        const images = await Promise.all(sources.map(async source => { const image = new Image(); image.src = source; await image.decode(); return image; }));
        const [before, after] = images;
        if (before.width !== after.width || before.height !== after.height) return { dimensionsMatch: false, before: [before.width, before.height], after: [after.width, after.height] };
        const pixels = images.map(image => { const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height; const context = canvas.getContext('2d'); context.drawImage(image, 0, 0); return context.getImageData(0, 0, image.width, image.height).data; });
        let changed = 0;
        let absoluteDelta = 0;
        for (let i = 0; i < pixels[0].length; i += 4) {
          const delta = [0, 1, 2].map(channel => Math.abs(pixels[0][i + channel] - pixels[1][i + channel]));
          if (Math.max(...delta) > 10) changed++;
          absoluteDelta += delta.reduce((sum, value) => sum + value, 0);
        }
        return { dimensionsMatch: true, width: before.width, height: before.height, changedPixelsAbove10: changed, diffRatio: changed / (before.width * before.height), meanChannelDelta: absoluteDelta / (before.width * before.height * 3) };
      }, sources);
      results.push({ files, ...result });
    }
    fs.writeFileSync(path.resolve(__dirname, '../_screens/hero-comparison.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
