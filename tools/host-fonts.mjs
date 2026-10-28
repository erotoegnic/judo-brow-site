import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';
async function download(url) {
  const response = await fetch(url, { headers: { 'User-Agent': userAgent }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Font download failed (${response.status}): ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

export async function hostFonts(root, subsets, refresh = false) {
  const directory = new URL('assets/fonts/', root);
  mkdirSync(directory, { recursive: true });
  const manifestPath = new URL('manifest.json', directory);
  const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : [];
  const definitions = [
    ...Object.entries(subsets).map(([weight, text]) => ({ family: 'Noto Serif TC', weight: Number(weight), text, file: `noto-serif-tc-${weight}.subset.woff2` })),
    { family: 'Allura', weight: 400, text: 'Taiwan B.Cart', file: 'allura.subset.woff2' },
  ];
  const entries = await Promise.all(definitions.map(async definition => {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${definition.family.replaceAll(' ', '+')}:wght@${definition.weight}&display=swap&text=${encodeURIComponent(definition.text)}`;
    const file = new URL(definition.file, directory);
    const cached = previous.find(entry => entry.cssUrl === cssUrl && entry.file === definition.file);
    if (!refresh && cached && existsSync(file) && hash(readFileSync(file)) === cached.sha256) return cached;
    const css = (await download(cssUrl)).toString('utf8');
    const sources = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)\s*format\(['"]woff2['"]\)/g)].map(match => match[1]))];
    if (sources.length !== 1) throw new Error(`Expected one WOFF2 subset for ${definition.family} ${definition.weight}`);
    const bytes = await download(sources[0]);
    if (bytes.subarray(0, 4).toString() !== 'wOF2') throw new Error('Invalid WOFF2 response');
    return { ...definition, cssUrl, sourceUrl: sources[0], bytes: bytes.length, sha256: hash(bytes), buffer: bytes };
  }));
  const licenses = [
    ['NotoSerifTC-OFL.txt', 'https://raw.githubusercontent.com/google/fonts/main/ofl/notoseriftc/OFL.txt'],
    ['Allura-OFL.txt', 'https://raw.githubusercontent.com/google/fonts/main/ofl/allura/OFL.txt'],
  ];
  for (const [file, url] of licenses) {
    const target = new URL(file, directory);
    if (!existsSync(target)) writeFileSync(target, await download(url));
  }
  for (const entry of entries) if (entry.buffer) writeFileSync(new URL(entry.file, directory), entry.buffer);
  const manifest = entries.map(({ buffer, ...entry }) => entry);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
