const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('C:/Users/eroto/Documents/_judo-codex/verify/node_modules/playwright-core');

async function main() {
  const browser = await chromium.launch({ executablePath: 'C:/Users/eroto/.codex/ms-playwright/chromium-1248/chrome-win64/chrome.exe', headless: true });
  try {
    const page = await browser.newPage();
    const directory = path.resolve(__dirname, '../assets/cases');
    const manifest = [];
    for (const file of fs.readdirSync(directory).filter(file => file.endsWith('.jpg'))) {
      const input = fs.readFileSync(path.join(directory, file));
      for (const targetWidth of [320, null]) {
        const result = await page.evaluate(async ({ source, targetWidth }) => {
          const image = new Image(); image.src = source; await image.decode();
          const width = targetWidth || image.naturalWidth;
          const height = Math.round(width * image.naturalHeight / image.naturalWidth);
          const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
          const context = canvas.getContext('2d');
          context.imageSmoothingQuality = 'high'; context.drawImage(image, 0, 0, width, height);
          return { encoded: canvas.toDataURL('image/webp', 0.78).split(',')[1], width, height };
        }, { source: `data:image/jpeg;base64,${input.toString('base64')}`, targetWidth });
        const output = file.replace('.jpg', targetWidth === null ? '.webp' : '-320.webp');
        const buffer = Buffer.from(result.encoded, 'base64'); fs.writeFileSync(path.join(directory, output), buffer);
        manifest.push({ file: output, width: result.width, height: result.height, bytes: buffer.length, originalBytes: input.length });
      }
    }
    fs.writeFileSync(path.resolve(__dirname, '../_screens/image-manifest.json'), JSON.stringify(manifest, null, 2));
    console.log(JSON.stringify(manifest));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
