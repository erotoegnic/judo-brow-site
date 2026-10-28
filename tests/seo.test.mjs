import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

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

test('fonts swap immediately and subset covers authored non-ASCII characters', () => {
  const links = [...html.matchAll(/<link rel="preload" as="style" href="([^"]+)"/g)].map(match => new URL(match[1].replaceAll('&amp;', '&')));
  assert.equal(links.length, 2);
  for (const url of links) assert.equal(url.searchParams.get('display'), 'swap');
  const noto = links.find(url => url.searchParams.getAll('family').some(family => family.startsWith('Noto')));
  const subset = new Set(noto.searchParams.get('text'));
  const source = html.replace(/<!-- FONT_LINKS_START -->[\s\S]*?<!-- FONT_LINKS_END -->/, '') + ['js/data.js', 'js/main.js', 'css/style.css'].map(file => readFileSync(new URL(file, root), 'utf8')).join('');
  for (const char of source) if (char.codePointAt(0) > 127) assert.ok(subset.has(char), `Run node tools/build.mjs: missing ${char}`);
  assert.equal(links.find(url => url.searchParams.get('family') === 'Allura').searchParams.get('text'), 'Taiwan B.Cart');
});
