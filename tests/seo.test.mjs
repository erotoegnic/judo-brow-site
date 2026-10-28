import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { serifSubsets } from '../tools/font-subset.mjs';

const root = new URL('../', import.meta.url);
const html = readFileSync(new URL('index.html', root), 'utf8');
const context = vm.createContext({ window: {} });
vm.runInContext(readFileSync(new URL('js/data.js', root), 'utf8'), context);
const data = JSON.parse(JSON.stringify(context.window.SITE_DATA));
const schema = () => {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1);
  const parsed = JSON.parse(blocks[0][1]);
  assert.equal(parsed['@context'], 'https://schema.org');
  return parsed['@graph'];
};

test('static structured data exactly matches all service names, descriptions and confirmed prices', () => {
  const salon = schema().find(item => item['@id'] === data.contact.siteUrl + '#salon');
  assert.deepEqual(salon['@type'], ['BeautySalon', 'LocalBusiness']);
  assert.deepEqual(salon.makesOffer.map(offer => offer.itemOffered), data.services.map(service => ({ '@type': 'Service', name: service.name, description: service.description })));
  assert.deepEqual(salon.makesOffer.filter(offer => 'price' in offer).map(offer => [offer.itemOffered.name, offer.price, offer.priceCurrency]), [['修眉', '150', 'TWD']]);
});

test('FAQ schema uses the exact visible data and website language', () => {
  const graph = schema();
  assert.deepEqual(graph.find(item => item['@type'] === 'FAQPage').mainEntity.map(item => ({ question: item.name, answer: item.acceptedAnswer.text })), data.faq);
  assert.equal(graph.find(item => item['@type'] === 'WebSite').inLanguage, 'zh-Hant-TW');
});

test('schema contains only confirmed location and contact facts', () => {
  const graph = schema();
  const salon = graph[0];
  assert.deepEqual(salon.address, { '@type': 'PostalAddress', addressLocality: '前金區', addressRegion: '高雄市', addressCountry: 'TW' });
  assert.deepEqual(salon.sameAs, [data.contact.instagram, data.contact.threads, data.contact.tiktok, data.contact.linePage]);
  assert.deepEqual(salon.contactPoint, { '@type': 'ContactPoint', contactType: 'reservations', url: data.contact.lineUrl });
  const serialized = JSON.stringify(graph);
  for (const forbidden of ['telephone', 'openingHours', 'openingHoursSpecification', 'review', 'aggregateRating', 'priceRange', 'streetAddress', 'postalCode']) assert.ok(!serialized.includes(`"${forbidden}"`), forbidden);
  assert.ok(!serialized.includes('"Person"'));
});

test('one semantic hero h1 and natural local search metadata', () => {
  assert.match(html, /<html lang="zh-Hant-TW">/);
  assert.equal([...html.matchAll(/<h1(?:\s|>)/g)].length, 1);
  const description = html.match(/<meta name="description" content="([^"]+)"/)[1];
  assert.ok([...description].length >= 80 && [...description].length <= 120);
  for (const term of ['高雄', '前金區', '霧眉', '霧唇', '眼線']) assert.ok(description.includes(term));
  assert.match(html, /橘豆<span class="sr-only">Judo｜高雄前金區半永久紋繡<\/span>/);
});

test('share metadata stays unique and sitemap points at canonical URL', () => {
  for (const key of ['og:image', 'og:image:width', 'og:image:height', 'og:image:alt', 'twitter:card', 'twitter:image']) assert.equal([...html.matchAll(new RegExp(`(?:property|name)="${key}"`, 'g'))].length, 1);
  assert.match(readFileSync(new URL('robots.txt', root), 'utf8'), /User-agent: \*\s+Allow: \/\s+Sitemap: https:\/\/erotoegnic.github.io\/judo-brow-site\/sitemap.xml/);
  const sitemap = readFileSync(new URL('sitemap.xml', root), 'utf8');
  assert.equal([...sitemap.matchAll(/<loc>/g)].length, 1);
  assert.ok(sitemap.includes(`<loc>${data.contact.siteUrl}</loc>`));
  assert.match(sitemap, /<lastmod>2026-10-28<\/lastmod>/);
});

test('all case images retain JPEG fallback and have both WebP sizes and accurate local alts', () => {
  for (const item of data.cases) {
    assert.ok(item.alt.includes('高雄') && item.alt.includes('橘豆'));
    for (const image of [item.image, item.image.replace('.jpg', '.webp'), item.image.replace('.jpg', '-320.webp')]) assert.ok(existsSync(new URL(image, root)), image);
  }
});

test('hero preload candidates match picture and scripts remain deferred', () => {
  const preload = html.match(/<link rel="preload" as="image"[^>]+>/)[0];
  const source = html.match(/<source type="image\/webp"[^>]+>/)[0];
  assert.equal(preload.match(/imagesrcset="([^"]+)"/)[1], source.match(/srcset="([^"]+)"/)[1]);
  assert.equal(preload.match(/imagesizes="([^"]+)"/)[1], source.match(/sizes="([^"]+)"/)[1]);
  for (const file of ['data', 'main']) assert.match(html, new RegExp(`<script src="js/${file}.js" defer>`));
  assert.ok(!html.includes('teacher-original.jpg'));
});

test('self-hosted fonts match current subsets, hashes and local face declarations', () => {
  const fonts = JSON.parse(readFileSync(new URL('assets/fonts/manifest.json', root), 'utf8'));
  assert.equal(fonts.length, 3);
  const subsets = serifSubsets(html, data, readFileSync(new URL('js/main.js', root), 'utf8'));
  for (const font of fonts) {
    assert.equal(font.text, font.family === 'Allura' ? 'Taiwan B.Cart' : subsets[font.weight]);
    const bytes = readFileSync(new URL('assets/fonts/' + font.file, root));
    assert.equal(bytes.subarray(0, 4).toString(), 'wOF2');
    assert.equal(bytes.length, font.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), font.sha256);
    assert.ok(html.includes("font-family:'" + font.family + "';font-style:normal;font-weight:" + font.weight + ";font-display:swap;src:url('assets/fonts/" + font.file + "') format('woff2')"));
  }
  assert.ok(!/fonts.(googleapis|gstatic).com/.test(html));
  const preloads = [...html.matchAll(/<link rel="preload" as="font"[^>]+>/g)].map(match => match[0]);
  assert.equal(preloads.length, 2);
  for (const preload of preloads) {
    assert.ok(preload.includes('type="font/woff2"'));
    assert.match(preload, /crossorigin/);
    assert.match(preload, /noto-serif-tc-(400|500).subset.woff2/);
  }
});

test('serif extraction follows data changes without including body copy', () => {
  const main = readFileSync(new URL('js/main.js', root), 'utf8');
  const changed = structuredClone(data);
  changed.services[0].name += '龜';
  changed.services[0].description += '麤';
  changed.faq[0].question += '鸞';
  changed.faq[0].answer += '鬱';
  const result = serifSubsets(html, changed, main);
  assert.ok(result[500].includes('龜'));
  assert.ok(result[400].includes('鸞'));
  assert.ok(!result[400].includes('麤') && !result[500].includes('麤'));
  assert.ok(!result[400].includes('鬱') && !result[500].includes('鬱'));
  for (const text of ['預約訊息已複製', '預約訊息已產生']) {
    for (const char of text) assert.ok(result[500].includes(char), `Missing confirmation glyph ${char}`);
  }
});

test('inline CSS exactly matches its editable source without a blocking stylesheet', () => {
  assert.equal(html.match(/<style id="site-css">([\s\S]*?)<\/style>/)[1], readFileSync(new URL('css/style.css', root), 'utf8').trim());
  assert.ok(!html.includes('href="css/style.css"'));
});
