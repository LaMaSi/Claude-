// Exports the pure-data modules in src/data to JSON for the Godot port (godot/data/*.json).
import { writeFileSync } from 'node:fs';
import { FAMILY, START_DATE } from '../src/data/family.js';
import { FURNITURE, NEEDS } from '../src/data/furniture.js';
import { startHouse, GRID } from '../src/data/startHouse.js';
import { TRAITS, SKILLS, WISHES, TAGS } from '../src/data/traits.js';
import { VARIANTS } from '../src/data/variants.js';

const out = (name, obj) => writeFileSync(new URL(`../godot/data/${name}.json`, import.meta.url), JSON.stringify(obj, null, 1));
out('family', { START_DATE, FAMILY });
out('furniture', { FURNITURE, NEEDS, GRID });
out('house', startHouse);
out('traits', { TRAITS, SKILLS, WISHES, TAGS });
out('variants', VARIANTS);
console.log('exported');
