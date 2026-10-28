const assert = require('node:assert/strict');
const fs = require('node:fs');
module.exports = async function runBrowserQA(browser, url) {
  const page = await browser.newPage();
  const errors = [];
  const consoleErrors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.addInitScript(() => { window.open = url => { window.lastOpenedURL = url; return null; }; });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const content = await page.evaluate(() => window.SITE_DATA);
  assert.equal(await page.locator('#notice-title').textContent(), content.bookingNotices.title);
  assert.equal(await page.locator('#notice-intro').textContent(), content.bookingNotices.intro);
  assert.deepEqual(await page.locator('.booking-notice-card li').allTextContents(), content.bookingNotices.groups.flatMap(group => group.items));
  assert.equal(await page.locator('#notice-outro').textContent(), content.bookingNotices.outro);
  assert.equal(await page.locator('.booking-notice-card').count(), 4);
  assert.equal(await page.locator('.service-card').count(), 11);
  assert.equal(await page.locator('.service-price').filter({ hasText: '價格請洽官方 LINE' }).count(), 10);
  assert.equal(await page.locator('.price-note').textContent(), '一人一針｜預約制');
  assert.deepEqual(await page.locator('.quote-card figcaption').allTextContents(), content.testimonials.map(item => '— ' + item.attribution));
  assert.deepEqual(await page.locator('.quote-card blockquote p').allTextContents(), content.testimonials.map(item => `「${item.quote}」`));
  assert.equal(await page.locator('#video-list a').count(), 5);
  for (const [index, video] of content.videos.entries()) {
    const link = page.locator('#video-list a').nth(index);
    assert.equal(await link.getAttribute('href'), 'https://www.tiktok.com/@0504jocelyn/' + video.path);
    assert.equal(await link.getAttribute('target'), '_blank');
    assert.ok((await link.getAttribute('rel')).includes('noopener'));
  }
  assert.equal(await page.locator('footer [data-contact="threads"]').getAttribute('href'), content.contact.threads);
  const schema = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  assert.ok(schema['@graph'].find(item => item['@id'].endsWith('#salon')).sameAs.includes(content.contact.threads));
  assert.equal(await page.locator('script[type="application/ld+json"]').count(), 1);
  assert.deepEqual(await page.locator('#faq details').evaluateAll(items => items.map(item => ({ question: item.querySelector('summary').textContent, answer: item.querySelector('p').textContent }))), content.faq);
  assert.equal(await page.locator('h1').textContent(), '橘豆Judo｜高雄前金區半永久紋繡');
  async function assertSerifCoverage() {
  const missingSerif = await page.evaluate(() => {
    const subsets = new Map([...document.querySelectorAll('link[as="style"]')].map(link => new URL(link.href))
      .filter(url => url.searchParams.get('family')?.startsWith('Noto Serif TC:'))
      .map(url => [url.searchParams.get('family').split('@')[1], new Set(url.searchParams.get('text'))]));
    const missing = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (parent.closest('.sr-only')) continue;
      const style = getComputedStyle(parent);
      if (!style.fontFamily.includes('Noto Serif TC')) continue;
      const subset = subsets.get(style.fontWeight);
      for (const character of node.textContent) if (!/\s/u.test(character) && !subset?.has(character)) missing.push({ text: node.textContent, character, weight: style.fontWeight });
    }
    return missing;
  });
  assert.deepEqual(missingSerif, [], 'Every actually serif-styled text node must be covered');
  }
  await assertSerifCoverage();
  const heroRequests = await page.evaluate(() => ({
    current: document.querySelector('.teacher-portrait img').currentSrc,
    requests: performance.getEntriesByType('resource').filter(entry => /\/assets\/teacher(?:-600)?\.(?:webp|jpg)$/.test(entry.name)).map(entry => entry.name),
  }));
  assert.deepEqual(heroRequests.requests, [heroRequests.current]);
  assert.equal(await page.locator('iframe').count(), 1);
  assert.equal(await page.locator('.map-fallback').getAttribute('href'), content.contact.mapLink);
  await page.locator('#location').scrollIntoViewIfNeeded();
  const mapFrame = await (await page.$('#location-map')).contentFrame();
  await mapFrame.waitForFunction(() => document.body && document.body.innerText.includes('Google') && Array.from(document.images).some(image => image.complete && image.naturalWidth >= 100), null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const id of ['home', 'services', 'cases', 'process', 'aftercare', 'testimonials', 'faq', 'location', 'notice', 'booking']) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: `_screens/seo-qa-site-${width}.png`, fullPage: true });
    if (width !== 768) {
      for (const id of ['services', 'cases', 'work-videos', 'testimonials', 'location', 'notice', 'booking']) {
        await page.locator(`#${id}`).scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        await page.locator(`#${id}`).screenshot({ path: `_screens/seo-qa-${id}-${width}.png`, style: '.site-header,.floating-line,.skip-link{visibility:hidden!important}' });
      }
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.menu-toggle').click();
  assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'true');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
  await page.locator('[data-filter="brow"]').click();
  assert.equal(await page.locator('.case-card').count(), 3);
  await page.locator('[data-filter="lip"]').click();
  assert.equal(await page.locator('.case-card').count(), 7);
  await page.locator('[data-filter="all"]').click();
  assert.equal(await page.locator('.case-card').count(), 9);
  await page.locator('.case-photo').first().click();
  assert.equal(await page.locator('#lightbox').evaluate(element => element.open), true);
  await page.locator('#lightbox-next').click();
  assert.match(await page.locator('#lightbox-title').textContent(), /眉眼唇整體/);
  await page.keyboard.press('ArrowLeft');
  await page.screenshot({ path: '_screens/seo-qa-lightbox-390.png' });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.case-photo').first().evaluate(element => document.activeElement === element), true);
  await page.locator('#faq details').first().locator('summary').click();
  assert.equal(await page.locator('#faq details').first().getAttribute('open'), '');
  await page.locator('[data-service="men-brow"]').click();
  assert.equal(await page.locator('#service').inputValue(), 'men-brow');
  await page.locator('[type="submit"]').click();
  assert.equal(await page.locator('#name').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.locator('#name').evaluate(element => document.activeElement === element), true);
  await page.screenshot({ path: '_screens/seo-qa-errors-390.png' });
  await page.locator('#name').fill('測試小橘');
  await page.locator('#phone').fill('0912-345 678');
  await page.locator('#date').fill('2020-01-01');
  await page.locator('#time').selectOption('下午');
  await page.locator('[name="experience"][value="否"]').check();
  await page.locator('[type="submit"]').click();
  assert.match(await page.locator('#date-error').textContent(), /不可早於/);
  await page.locator('#date').fill(await page.locator('#date').getAttribute('min'));
  await page.locator('[type="submit"]').click();
  assert.equal(await page.locator('#noticeRead').getAttribute('aria-invalid'), 'true');
  assert.equal(await page.locator('#noticeRead').evaluate(element => document.activeElement === element), true);
  assert.match(await page.locator('#noticeRead-error').textContent(), /請先閱讀/);
  await page.locator('.form-notice-link').click();
  assert.equal(new URL(page.url()).hash, '#notice');
  await page.locator('.notice-return').click();
  assert.equal(await page.locator('#name').inputValue(), '測試小橘');
  await page.locator('#health-0').check();
  await page.locator('#health-3').check();
  await page.locator('#noticeRead').check();
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedText = text; } } }); });
  await page.locator('[type="submit"]').click();
  await page.locator('#booking-confirmation').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#confirmation-title').textContent(), '預約訊息已複製');
  const preview = await page.locator('#message-preview').textContent();
  assert.match(preview, /電話：0912345678/);
  assert.match(preview, /服務項目：男士霧眉/);
  assert.match(preview, /健康狀況告知：唇皰疹體質、有接睫毛/);
  assert.match(preview, /已閱讀預約前注意事項：是/);
  const line = await page.locator('#send-line').getAttribute('href');
  assert.equal(line, 'https://line.me/R/oaMessage/@184kwhyi/?' + encodeURIComponent(preview));
  assert.equal(await page.evaluate(() => window.lastOpenedURL), line);
  await page.screenshot({ path: '_screens/seo-qa-confirmation-390.png' });
  await page.locator('#edit-booking').click();
  assert.equal(await page.locator('#name').inputValue(), '測試小橘');
  assert.equal(await page.locator('#health-0').isChecked(), true);
  assert.equal(await page.locator('#health-3').isChecked(), true);
  assert.equal(await page.locator('#noticeRead').isChecked(), true);
  await page.evaluate(() => { navigator.clipboard.writeText = async () => { throw new Error('denied'); }; document.execCommand = () => false; });
  await page.locator('[type="submit"]').click();
  await page.locator('#booking-confirmation').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#confirmation-title').textContent(), '預約訊息已產生');
  await assertSerifCoverage();
  await page.locator('#copy-message').click();
  assert.match(await page.locator('#copy-status').textContent(), /手動複製/);
  await page.goto(require("node:url").pathToFileURL(require("node:path").resolve("index.html")).href);
  assert.equal(await page.locator('.service-card').count(), 11);
  assert.equal(await page.locator('.case-card').count(), 9);
  assert.equal(await page.locator('#faq details').count(), 6);
  await page.locator('#name').fill('本機測試');
  await page.locator('#phone').fill('0912345678');
  await page.locator('#service').selectOption('soft-lip');
  await page.locator('#date').fill(await page.locator('#date').getAttribute('min'));
  await page.locator('#time').selectOption('晚上');
  await page.locator('[name="experience"][value="是"]').check();
  await page.locator('#noticeRead').check();
  await page.locator('[type="submit"]').click();
  await page.locator('#booking-confirmation').waitFor({ state: 'visible' });
  assert.match(await page.locator('#message-preview').textContent(), /韓系霧唇/);
  assert.match(await page.locator('#message-preview').textContent(), /健康狀況告知：無/);
  const noJS = await browser.newContext({ javaScriptEnabled: false });
  const fallback = await noJS.newPage();
  await fallback.goto(url);
  assert.equal(await fallback.locator('#booking-form').isVisible(), false);
  assert.equal(await fallback.locator('.noscript a').isVisible(), true);
  await noJS.close();
  const optionalVideos = await browser.newPage();
  await optionalVideos.route('**/js/data.js', async route => {
    const body = fs.readFileSync('js/data.js', 'utf8') + '\nwindow.SITE_DATA.videos = [];';
    await route.fulfill({ body, contentType: 'application/javascript' });
  });
  await optionalVideos.goto(url);
  assert.equal(await optionalVideos.locator('#work-videos').isVisible(), false);
  assert.equal(await optionalVideos.locator('footer [data-contact="tiktok"]').isVisible(), true);
  await optionalVideos.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(consoleErrors, []);
  fs.writeFileSync('_screens/seo-qa-qa-result.json', JSON.stringify({ round: 2, status: 'PASS', viewports: [390, 768, 1280], scenarios: ['responsive overflow', 'owner notices exact text', '11 services and sole confirmed price', 'real quotes and attribution', 'five video links and optional empty row', 'Threads schema and footer', 'Dali map loaded and fallback', 'menu and Escape', 'filters', 'lightbox next previous Escape focus restoration', 'FAQ', 'service preselection', 'required fields and focus', 'past date rejected', 'required notice checkbox and focus', 'notice anchor preserves fields', 'multiple health values and empty health', 'valid message and URL', 'copy allowed', 'copy denied and fallback denied', 'edit preserves all values', 'file protocol booking', 'no-JS fallback'], pageErrors: errors, consoleErrors, externalLineNavigation: 'intercepted; no message sent' }, null, 2));
  console.log('Browser QA PASS');
};
