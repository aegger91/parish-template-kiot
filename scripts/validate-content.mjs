// Validates every file in content/ against its JSON Schema, then checks cross-references between files.
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
for (const f of readdirSync(new URL('schemas/', root))) ajv.addSchema(read(`schemas/${f}`), f);

let failed = 0;
const fail = (msg) => {
  failed++;
  console.error('  x ' + msg);
};

const content = {};
for (const f of readdirSync(new URL('content/', root)).filter((f) => f.endsWith('.json'))) {
  const data = read(`content/${f}`);
  content[f.replace('.json', '')] = data;
  const schema = data.$schema?.split('/').pop();
  const validate = schema && ajv.getSchema(schema);
  if (!validate) {
    fail(`${f}: no schema`);
    continue;
  }
  if (validate(data)) console.log(`ok ${f}`);
  else validate.errors.forEach((e) => fail(`${f}${e.instancePath} ${e.message}`));
}

/* Cross-file checks */
const { site, pages, gallery, ui } = content;
const langs = site.languages.map((l) => l.code);
if (!langs.includes(site.defaultLanguage)) fail(`site.defaultLanguage "${site.defaultLanguage}" is not in languages`);
const imageIds = new Set(gallery.images.map((i) => i.id));
const pageIds = new Set();
const ids = new Map();
const walk = (n) => {
  if (pageIds.has(n.id)) fail(`pages: duplicate page id ${n.id}`);
  pageIds.add(n.id);
  for (const s of n.sections) {
    if (ids.has(s.id)) fail(`pages: duplicate section id ${s.id}`);
    ids.set(s.id, n.id);
    if (s.image && !imageIds.has(s.image)) fail(`pages: section ${s.id} uses unknown image ${s.image}`);
  }
  for (const k of ['headerImage', 'cardImage']) if (n[k] && !imageIds.has(n[k])) fail(`pages: ${n.id}.${k} unknown image ${n[k]}`);
  (n.children ?? []).forEach(walk);
};
pages.pages.forEach(walk);
const links = JSON.stringify(pages).matchAll(/"page":\s*"([^"]+)"/g);
for (const [, id] of links) if (!pageIds.has(id)) fail(`pages: link to unknown page ${id}`);
for (const img of gallery.images) {
  if (!existsSync(new URL(`public${img.src}`, root))) fail(`gallery: missing file ${img.src}`);
  if (img.source && !content['image-sources'].sources.some((s) => s.id === img.source)) fail(`gallery: ${img.id} has unknown source ${img.source}`);
}
for (const p of content.store.products) for (const src of p.images) if (!existsSync(new URL(`public${src}`, root))) fail(`store: missing image ${src}`);
for (const s of content['parish-services'].services) if (s.illustration && !existsSync(new URL(`public${s.illustration}`, root))) fail(`parish-services: missing ${s.illustration}`);
for (const [k, v] of Object.entries(ui.strings)) {
  if (typeof v === 'object' && !v[site.defaultLanguage]) fail(`ui: "${k}" has no ${site.defaultLanguage} text`);
}
const text = readFileSync(new URL('content/ui.json', root), 'utf8') + JSON.stringify(content);
if (/\u2014/.test(text)) fail('content contains an em dash');

if (failed) {
  console.error(`\n${failed} problem(s).`);
  process.exit(1);
}
console.log('\nAll content valid.');
