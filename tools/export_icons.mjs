// Exports the Game-icons subset embedded in src/ui_icons.js to SVG files (godot/ui/icons/*.svg) plus the emoji map.
import { readFileSync, writeFileSync } from 'node:fs';
const src = readFileSync(new URL('../src/ui_icons.js', import.meta.url), 'utf8');
const BODY = JSON.parse(src.match(/const BODY = (\{.*\});/)[1]);
const MAP = JSON.parse(src.match(/const MAP = (\{.*\});/)[1]);
const GOLD = '#f0cd76';
for (const [name, body] of Object.entries(BODY)) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="${GOLD}">${body.replaceAll('currentColor', GOLD)}</svg>`;
  writeFileSync(new URL(`../godot/ui/icons/${name}.svg`, import.meta.url), svg);
}
const MOUTH = ['M176 360q80-70 160 0', 'M176 350q80-40 160 0', 'M186 350h140', 'M176 330q80 40 160 0', 'M170 320q86 90 172 0z'];
MOUTH.forEach((m, i) => writeFileSync(new URL(`../godot/ui/icons/face${i}.svg`, import.meta.url),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="none" stroke="${GOLD}" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"><circle cx="256" cy="256" r="220"/><circle cx="186" cy="215" r="12" fill="${GOLD}"/><circle cx="326" cy="215" r="12" fill="${GOLD}"/><path d="${m}"/></svg>`));
writeFileSync(new URL('../godot/data/icons.json', import.meta.url), JSON.stringify(MAP));
console.log('icons', Object.keys(BODY).length, 'emoji map', Object.keys(MAP).length);
