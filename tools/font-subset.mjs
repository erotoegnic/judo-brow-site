const unique = text => ' ' + [...new Set([...text].filter(character => !/\s/u.test(character)))].sort().join('');
const plain = html => html
  .replace(/<span\b[^>]*class="sr-only"[^>]*>[\s\S]*?<\/span>/g, '')
  .replace(/<small\b[^>]*>[\s\S]*?<\/small>/g, '')
  .replace(/<span\b[^>]*class="brand-latin"[^>]*>[\s\S]*?<\/span>/g, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#(x[\da-f]+|\d+);/gi, (_, code) => String.fromCodePoint(code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)))
  .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[name]);

// These groups mirror the serif selectors in style.css; browser QA checks actual computed styles.
export function serifSubsets(html, data, main) {
  const body = html.split('<body>')[1].split('</body>')[0];
  const headings = [...body.matchAll(/<h[123]\b[^>]*>([\s\S]*?)<\/h[123]>/g)].map(match => plain(match[1]));
  const display = [...body.matchAll(/<(p|a)\b[^>]*class="([^"]+)"[^>]*>([\s\S]*?)<\/\1>/g)]
    .filter(match => match[2].split(/\s+/).some(name => ['brand', 'brand-subtitle', 'hero-tagline', 'care-emphasis', 'contact-tile'].includes(name)))
    .map(match => plain(match[3]));
  const confirmations = [...main.matchAll(/\$\('#confirmation-title'\)\.textContent\s*=\s*([^;]+);/g)];
  if (!confirmations.length) throw new Error('Confirmation heading source changed; update serif extraction');
  for (const confirmation of confirmations) headings.push(...[...confirmation[1].matchAll(/'([^']+)'/g)].map(match => match[1]));
  headings.push(...data.services.map(service => service.name), ...data.cases.map(item => item.title), data.contact.location,
    data.bookingNotices.title, ...data.bookingNotices.groups.map(group => `${group.no} ${group.title}`));
  display.push(...data.faq.map(item => item.question), ...data.testimonials.map(item => `「${item.quote}」`), data.bookingNotices.outro);
  return { 400: unique(display.join('')), 500: unique(headings.join('')) };
}
