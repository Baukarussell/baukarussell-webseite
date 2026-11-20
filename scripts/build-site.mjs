import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Publishes Decap Markdown entries as browser-readable JSON during Cloudflare builds.
const names = (await readdir('events')).filter(name => name.endsWith('.md'));
const entries = [];
for (const name of names) {
  const raw = await readFile(path.join('events',name), 'utf8');
  const found = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!found) continue;
  const event = { slug: name.slice(0,-3), body: found[2].trim(), gallery: [] };
  let inGallery = false;
  for (const line of found[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (field) {
      if (field[1] === 'galerie' || field[1] === 'gallery') {inGallery=true;continue;}
      inGallery=false;
      event[field[1]] = field[2].trim().replace(/^["']|["']$/g,'');
    } else if (inGallery) {
      const item = line.match(/^\s*-\s*(?:image:\s*)?(.+)$/) || line.match(/^\s*image:\s*(.+)$/);
      if (item) event.gallery.push(item[1].trim().replace(/^["']|["']$/g,''));
    }
  }
  if (!event.title || !event.date) continue;
  // Restrict media paths to site assets.
  const media = value => {
    const v=String(value||'');
    return /^\/(logos|events|uploads)\//.test(v) ? v : /^(logos|events|uploads)\//.test(v) ? '/'+v : '';
  };
  event.image=media(event.image);
  event.gallery=event.gallery.map(media).filter(Boolean);
  event.year=String(event.date).slice(0,4);
  entries.push(event);
}
entries.sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
await writeFile('events-data.json',JSON.stringify(entries,null,2));
console.log('Published '+entries.length+' CMS event record(s).');