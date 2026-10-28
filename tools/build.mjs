import { readFileSync, writeFileSync } from 'node:fs';
import vm from 'node:vm';

const root = new URL('../', import.meta.url);
const read = file => readFileSync(new URL(file, root), 'utf8');
const context = vm.createContext({ window: {} });
vm.runInContext(read('js/data.js'), context);
const data = context.window.SITE_DATA;
let html = read('index.html');
const base = data.contact.siteUrl;
if (!base || !base.endsWith('/')) throw new Error('contact.siteUrl must be an absolute site URL ending in /');
const absolute = file => new URL(file, base).href;
const description = html.match(/<meta name="description" content="([^"]+)"/)[1];
const graph = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': ['BeautySalon', 'LocalBusiness'], '@id': absolute('#salon'),
      name: data.contact.name, alternateName: data.contact.englishName, url: base,
      image: [absolute('assets/teacher.jpg'), absolute('assets/og-image.jpg')],
      logo: absolute('favicon.svg'), description,
      address: { '@type': 'PostalAddress', addressLocality: '前金區', addressRegion: '高雄市', addressCountry: 'TW' },
      areaServed: ['高雄市前金區', '高雄市'],
      sameAs: [data.contact.instagram, data.contact.threads, data.contact.tiktok, data.contact.linePage],
      contactPoint: { '@type': 'ContactPoint', contactType: 'reservations', url: data.contact.lineUrl },
      makesOffer: data.services.map(service => {
        const offer = { '@type': 'Offer', itemOffered: { '@type': 'Service', name: service.name, description: service.description } };
        if (service.id === 'brow-shaping') {
          if (service.price !== 'NT$150') throw new Error('Review the confirmed shaping price before rebuilding schema');
          offer.price = '150'; offer.priceCurrency = 'TWD';
        } else if (service.price !== null) throw new Error(`Review newly supplied price: ${service.name}`);
        return offer;
      }),
    },
    { '@type': 'FAQPage', '@id': absolute('#faq'), mainEntity: data.faq.map(item => ({ '@type': 'Question', name: item.question, acceptedAnswer: { '@type': 'Answer', text: item.answer } })) },
    { '@type': 'WebSite', '@id': absolute('#website'), name: data.contact.name, url: base, inLanguage: 'zh-Hant-TW' },
  ],
};
const schema = `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2).replaceAll('<', '\\u003c')}\n  </script>`;
html = html.replace(/^[ \t]*<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/gm, '');
html = html.replace('</head>', `  ${schema}\n</head>`);

// Include authored content and UI messages, plus ASCII for dates and typed form values.
const fontSource = html.replace(/<!-- FONT_LINKS_START -->[\s\S]*?<!-- FONT_LINKS_END -->/, '') + read('js/data.js') + read('js/main.js') + read('css/style.css');
const text = [...new Set([...fontSource].filter(char => char.codePointAt(0) > 127).concat(Array.from({ length: 95 }, (_, i) => String.fromCharCode(i + 32))))].sort().join('');
const families = 'family=Noto+Sans+TC:wght@400;500&family=Noto+Serif+TC:wght@400;500';
const noto = `https://fonts.googleapis.com/css2?${families}&display=swap&text=${encodeURIComponent(text)}`;
const script = `https://fonts.googleapis.com/css2?family=Allura&display=swap&text=${encodeURIComponent('Taiwan B.Cart')}`;
const links = [noto, script].map(url => {
  const escaped = url.replaceAll('&', '&amp;');
  return `  <link rel="preload" as="style" href="${escaped}" onload="this.onload=null;this.rel='stylesheet'">\n  <noscript><link rel="stylesheet" href="${escaped}"></noscript>`;
}).join('\n');
html = html.replace(/<!-- FONT_LINKS_START -->[\s\S]*?<!-- FONT_LINKS_END -->/, `<!-- FONT_LINKS_START -->\n${links}\n  <!-- FONT_LINKS_END -->`);
writeFileSync(new URL('index.html', root), html);
console.log(`Static schema: ${data.services.length} services, ${data.faq.length} FAQs; font subset: ${text.length} characters.`);
