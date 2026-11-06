// Random household generator. Pure data + a seedable RNG (no rendering, no DOM), so it runs headless.
// It produces the SAME shape as the hand-written entries in family.js, so the sim and UI need no changes.
//   generateHousehold(seed)  ->  [ { id, name, role, age, look, traits, likes, dislikes, skills, relations, goals, ... } ]
// Everything content-like (names, jobs, bios, trait affinities) is a table at the top: extend the tables, not the code.
import { TRAITS, SKILLS, TAGS } from './traits.js';
import { START_DATE } from './family.js';

// ---- seedable RNG ----------------------------------------------------------------------------------------------
function hashSeed(s) { let h = 1779033703 ^ String(s).length; for (const ch of String(s)) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); } return h >>> 0; }
export function makeRng(seed) {
  let a = hashSeed(seed);
  const next = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const r = {
    next,
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    range: (lo, hi) => lo + next() * (hi - lo),
    chance: (p) => next() < p,
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    shuffle: (arr) => { const o = arr.slice(); for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [o[i], o[j]] = [o[j], o[i]]; } return o; },
    /** pick one entry of `items` with weight fn(item) (>0 is eligible) */
    weighted: (items, fn) => {
      const ws = items.map(fn), total = ws.reduce((s, w) => s + Math.max(0, w), 0);
      if (total <= 0) return items[Math.floor(next() * items.length)];
      let x = next() * total;
      for (let i = 0; i < items.length; i++) { x -= Math.max(0, ws[i]); if (x <= 0) return items[i]; }
      return items[items.length - 1];
    },
  };
  return r;
}

// ---- content tables ---------------------------------------------------------------------------------------------
const NAMES = {
  m: ['Alder', 'Bram', 'Cedric', 'Dunstan', 'Edric', 'Fenn', 'Garrick', 'Hob', 'Ivo', 'Jory', 'Kasimir', 'Ludo', 'Merrick', 'Osric', 'Piers', 'Roland', 'Silas', 'Tobias', 'Ulric', 'Wystan', 'Aldous', 'Bertram', 'Corwin', 'Tam'],
  f: ['Odette', 'Greta', 'Isolde', 'Mara', 'Nell', 'Yara', 'Thea', 'Linnea', 'Wynn', 'Elspeth', 'Hilda', 'Maud', 'Petra', 'Rosalind', 'Sybil', 'Tilda', 'Una', 'Verity', 'Agnes', 'Brynn', 'Clara', 'Dorothea', 'Edda', 'Freya'],
};
const SKIN = [0xf6d9c4, 0xf0c4a0, 0xe0a97c, 0xc9955f, 0xa8714a, 0x7a4a30, 0x56331f];
const HAIR = { dark: [0x1a1417, 0x2e2a33, 0x2a2024, 0x3a2a22], brown: [0x5b3a29, 0x6b4a32, 0x7a5a3a, 0x4a3426], light: [0xd9a441, 0xe3c46c, 0xc2a05a], red: [0xb04a22, 0xc2491f, 0x9a3a22], grey: [0xb8b8bc, 0xd8d8dc, 0x8a8a8e, 0xeeeeee] };
const EYE_COLORS = [0x4a3a2c, 0x3a2a1c, 0x4a8a3a, 0x6a9ad0, 0x6a8aa8, 0x3a8a6a, 0x8a5a2a];
const SHIRTS = [0x4f7a9c, 0x7a9a5a, 0x9a4a6a, 0xc2742a, 0x6a9a6a, 0x8a7a58, 0x3f4f7a, 0x7a4a3a, 0x5f8a58, 0xb8433f, 0x8a7a68, 0x6a5a7a, 0x4f6a6a, 0xd9a441, 0x9a5a7a];
const PANTS = [0x6b5a48, 0x8a6a48, 0x5a4a3c, 0x4a4a52, 0x6a5a3a, 0x3f3a36];
const CLOAKS = [0x4a3f55, 0x5a6a4a, 0x7a2a2a, 0x2f6a6a, 0x5a4a3a, 0x2a3f7a];
const HAT_COLORS = [0xf0e8d4, 0xb8433f, 0x5f8a58, 0x4f7a9c, 0x7a5a3a, 0xc2491f, 0x5a6a4a];
const FACIAL = ['full', 'goatee', 'mustache', 'mutton', 'sideburns', 'curly', 'long'];

// tag -> skill that furniture of that tag trains (see FURNITURE.trains)
const SKILL_OF_TAG = { cooking: 'cooking', gardening: 'herbalism', music: 'music', reading: 'lore', 'sword-fighting': 'fighting', fishing: 'fishing', painting: 'painting', tales: 'lore' };
const TAG_OF_SKILL = { cooking: 'cooking', herbalism: 'gardening', music: 'music', lore: 'reading', fighting: 'sword-fighting', fishing: 'fishing', painting: 'painting' };
const TRAINABLE = Object.keys(TAG_OF_SKILL);

// Traits that should not meet in one person.
const CLASHES = [['quiet', 'sociable'], ['lonewolf', 'sociable'], ['lazy', 'hardworking'], ['lazy', 'fit'], ['lazy', 'adventurous'], ['coward', 'adventurous'],
  ['coward', 'short-tempered'], ['kind', 'short-tempered'], ['quiet', 'virtuous'], ['lonewolf', 'mischievous'], ['tidy', 'natural'], ['stubborn', 'curious'], ['hearty', 'fit']];
// How a trait colours a face: eyes / brows / mouth tendencies.
const FACE_BIAS = {
  kind: { eyes: ['happy', 'big', 'wide'], mouth: ['smile', 'grin'] }, 'short-tempered': { brows: ['angry', 'thick'], mouth: ['frown', 'flat', 'smirk'], eyes: ['narrow'] },
  coward: { brows: ['worried'], eyes: ['wide', 'big'], mouth: ['o', 'flat'] }, lazy: { eyes: ['sleepy'] }, mischievous: { mouth: ['smirk', 'grin'], eyes: ['happy', 'narrow'] },
  sociable: { mouth: ['grin', 'smile', 'open'], eyes: ['happy', 'big'] }, quiet: { mouth: ['flat', 'smile'], eyes: ['dot', 'sleepy'] }, dreamer: { eyes: ['sleepy', 'wide'] },
  curious: { eyes: ['wide', 'big'], brows: ['arched'] }, mystical: { eyes: ['wide', 'sleepy'], brows: ['arched', 'worried'] }, stubborn: { jaw: ['square'], brows: ['thick', 'bushy'] },
  fit: { jaw: ['square', 'round'] }, creative: { eyes: ['wide', 'happy'], brows: ['arched'] },
};

// Jobs. `traits` = who suits it; `skills` = skill ids used (see SKILLS); `look` = optional outfit/headwear hints.
const JOBS = [
  { title: 'Woodcutter', place: 'The Eastwood edge', hours: [7, 17], wage: 6, skills: ['woodcraft'], traits: ['hardworking', 'fit', 'practical', 'quiet', 'lonewolf'], note: 'Fells and hauls timber for the village mill. Quiet work among the trees.', icon: '🪓', look: { outfit: 'smith' } },
  { title: 'Farmer', place: 'The barley fields', hours: [6, 16], wage: 5, skills: ['herbalism', 'woodcraft'], traits: ['hardworking', 'natural', 'practical', 'fit'], note: 'Sows, tends and reaps the village’s barley and beans.', icon: '🌾', look: { headwear: 'strawhat' } },
  { title: 'Herbalist', place: 'The cottage garden', hours: [8, 16], wage: 4, skills: ['herbalism', 'cooking'], traits: ['natural', 'curious', 'kind', 'mystical', 'tidy'], note: 'Brews salves and tinctures, sold at the village market on market days.', icon: '🌿', look: { headwear: 'kerchief' } },
  { title: 'Baker', place: 'The village bakehouse', hours: [4, 12], wage: 5, skills: ['cooking'], traits: ['hearty', 'sociable', 'hardworking', 'tidy', 'practical'], note: 'Up before dawn to bake the village’s bread.', icon: '🥖', look: { outfit: 'smith', headwear: 'bakerhat' } },
  { title: 'Cook', place: 'The tavern kitchen', hours: [10, 20], wage: 4, skills: ['cooking'], traits: ['hearty', 'practical', 'sociable', 'tidy'], note: 'Stirs the cauldron at the Green Man and feeds half the village.', icon: '🍲', look: {} },
  { title: 'Blacksmith', place: 'The forge', hours: [7, 17], wage: 8, skills: ['woodcraft', 'fighting'], traits: ['fit', 'short-tempered', 'hardworking', 'stubborn'], note: 'Shoes horses, mends ploughs and, now and then, forges a blade.', icon: '🔨', look: { outfit: 'smith' } },
  { title: 'Fisher', place: 'The river bend', hours: [5, 14], wage: 4, skills: ['fishing'], traits: ['lonewolf', 'lazy', 'natural', 'lucky', 'quiet'], note: 'Sells the morning’s catch to the market village.', icon: '🎣', look: { headwear: 'hood' } },
  { title: 'Hunter', place: 'The deep Eastwood', hours: [5, 15], wage: 6, skills: ['fighting', 'woodcraft'], traits: ['lonewolf', 'adventurous', 'fit', 'natural'], note: 'Tracks game through the forest and sells hides and meat.', icon: '🏹', look: { outfit: 'jerkin', headwear: 'hood' } },
  { title: 'Minstrel', place: 'The village green', hours: [14, 22], wage: 3, skills: ['music'], traits: ['virtuous', 'sociable', 'dreamer', 'creative', 'mischievous'], note: 'Plays at feasts and market days for coin and applause.', icon: '🎶', look: { outfit: 'jerkin' } },
  { title: 'Painter', place: 'The attic studio', hours: [9, 17], wage: 3, skills: ['painting'], traits: ['creative', 'dreamer', 'quiet'], note: 'Paints signs, banners and the odd portrait for the wealthy.', icon: '🖌️', look: { outfit: 'robe' } },
  { title: 'Scribe', place: 'The chapel scriptorium', hours: [8, 16], wage: 5, skills: ['lore'], traits: ['curious', 'quiet', 'coward', 'tidy', 'mystical'], note: 'Copies letters, deeds and holy books by candlelight.', icon: '📜', look: { outfit: 'robe', accessories: ['glasses'] } },
  { title: 'Hedge-witch', place: 'The hut at the marsh', hours: [10, 18], wage: 3, skills: ['magic', 'herbalism'], traits: ['mystical', 'curious', 'natural', 'lonewolf'], note: 'Sells charms and cures. Villagers whisper, but they still knock on the door.', icon: '🔮', look: { outfit: 'robe', headwear: 'pointed' } },
  { title: 'Merchant', place: 'The market square', hours: [8, 17], wage: 9, skills: ['trading'], traits: ['lucky', 'sociable', 'mischievous', 'practical'], note: 'Buys low in the market village and sells high everywhere else.', icon: '⚖️', look: { outfit: 'noble' } },
  { title: 'Peddler', place: 'The roads between villages', hours: [8, 18], wage: 4, skills: ['trading'], traits: ['mischievous', 'adventurous', 'sociable', 'lucky'], note: 'Carries pins, ribbons and rumours from door to door.', icon: '🎒', look: { outfit: 'jerkin' } },
  { title: 'Shepherd', place: 'The north meadow', hours: [6, 18], wage: 4, skills: ['herbalism'], traits: ['animal-friend', 'quiet', 'lonewolf', 'natural'], note: 'Walks the flock from meadow to meadow with a dog at heel.', icon: '🐑', look: { headwear: 'strawhat' } },
  { title: 'Town guard', place: 'The village gate', hours: [8, 20], wage: 7, skills: ['fighting'], traits: ['fit', 'short-tempered', 'adventurous', 'stubborn'], note: 'Watches the gate and breaks up tavern brawls.', icon: '🛡️', look: { outfit: 'jerkin', headwear: 'flatcap' } },
  { title: 'Innkeeper', place: 'The Green Man inn', hours: [10, 23], wage: 7, skills: ['cooking', 'trading'], traits: ['sociable', 'hearty', 'kind', 'mischievous'], note: 'Keeps the beds clean, the ale cold and the gossip flowing.', icon: '🍺', look: {} },
  { title: 'Healer', place: 'The cottage clinic', hours: [8, 17], wage: 5, skills: ['herbalism', 'lore'], traits: ['kind', 'curious', 'tidy', 'natural'], note: 'Sets bones, delivers babies and sits up with the sick.', icon: '🩹', look: { headwear: 'coif' } },
  { title: 'Weaver', place: 'The loom room', hours: [8, 16], wage: 4, skills: ['painting'], traits: ['creative', 'tidy', 'practical', 'quiet'], note: 'Weaves cloth in the village’s best-loved patterns.', icon: '🧵', look: {} },
];
const JOB_BY_TITLE = Object.fromEntries(JOBS.map((j) => [j.title, j]));

// One sentence per trait for the bio. {N} name, {he} {his} {him}, {He}
const BIO = {
  hardworking: '{N} is never idle and takes pride in a day’s honest labour.', quiet: '{He} speaks little, but notices everything.', sociable: '{N} can talk to anyone and rarely eats alone.',
  hearty: '{He} has a legendary appetite and a soft spot for a full table.', curious: '{N} asks questions of everything and everyone.', dreamer: '{N}’s mind is often somewhere far away.',
  lazy: '{He} would sleep until noon every day if the world allowed it.', kind: '{N} would give {his} last crust to a stranger.', adventurous: '{He} has itchy feet and a bundle always half-packed in {his} mind.',
  tidy: '{He} cannot rest while there is a smudge on anything.', practical: '{N} fixes things before anyone has noticed they are broken.', stubborn: '{N} has never once been talked out of a decision.',
  creative: '{N} sees pictures in the grain of the wood and the smoke of the fire.', virtuous: '{N} hums as {he} works, and the whole house seems lighter for it.', 'short-tempered': '{N} has a quick temper and a quicker apology, sometimes.',
  mystical: '{N} reads omens in the weather and keeps strange charms in {his} pockets.', natural: '{N} is happiest with soil under {his} nails.', 'animal-friend': 'Stray animals follow {him} home, and {he} never turns one away.',
  lonewolf: '{N} needs long hours of solitude, and is loyal beyond words to the few {he} lets close.', mischievous: '{N} cannot resist a prank, and has a talent for not being caught.', fit: '{He} is strong and restless unless {he} has something heavy to lift.',
  coward: '{N} jumps at every creak in the dark and sleeps with the shutters closed.', lucky: '{N} has a knack of landing on {his} feet, which {he} does not entirely deserve.',
};
const BIO_END = { child: ['{N} has lived in the Eastwood cottage all {his} life.', 'Most days {he} is somewhere {his} parents would rather {he} was not.', '{He} is still working out what {he} wants to be.'],
  adult: ['{N} has lived most of {his} life in the Eastwood.', 'The village knows {him} as a {job}.', '{He} has a long memory and a short list of regrets.', 'Most people in the valley have a story about {him}.'] };

// a small trait-flavoured memory for the Past tab
const TRAIT_EVENTS = {
  adventurous: ['🧭', 'Wandered a full day from home before anyone noticed.'], curious: ['📖', 'Took apart the village clock to see how it worked.'], creative: ['🎨', 'Painted a mural on the cottage wall in charcoal.'],
  virtuous: ['🎶', 'Sang at the harvest feast and silenced the whole hall.'], mischievous: ['😈', 'Swapped every shoe in the chapel porch.'], lucky: ['🍀', 'Found a silver penny in a cow-pat.'], fit: ['💪', 'Won the log-throwing at the midsummer fair.'],
  'short-tempered': ['💢', 'Got into a famous brawl behind the alehouse.'], mystical: ['🔮', 'Saw something in the marsh mist and never spoke of it.'], natural: ['🌳', 'Raised a sapling oak from an acorn.'], 'animal-friend': ['🐾', 'Nursed an injured fox back to health.'],
  lonewolf: ['🐺', 'Spent a whole winter alone in the woodman’s hut.'], coward: ['🐔', 'Hid in the hayloft all through the thunderstorm.'], kind: ['💛', 'Sat up three nights with a sick neighbour.'], hearty: ['🍖', 'Ate three pies at the fair and asked for a fourth.'],
  hardworking: ['💪', 'Brought in the harvest single-handed after a neighbour’s accident.'], sociable: ['🎉', 'Danced until dawn at the midsummer feast.'], dreamer: ['☁️', 'Fell asleep under a hedge and missed the entire fair.'], tidy: ['🧼', 'Scrubbed the chapel floor unasked.'],
  practical: ['🛠️', 'Rebuilt the cottage door with scrap oak.'], stubborn: ['🪨', 'Refused to leave the field during a hailstorm.'], quiet: ['🤫', 'Went a whole month without a word and nobody minded.'], lazy: ['😴', 'Slept through the bell, the cart and the cockerel.'],
};

const DREAMS = [
  ['Something beyond the forest is stirring in {him}, though {he} does not know it yet.', []], ['There is a loss {he} has never quite made peace with.', []], ['A restless longing for the big city, never spoken aloud.', ['adventurous', 'lucky']],
  ['{He} keeps dreaming of a book {he} has never seen.', ['mystical', 'curious']], ['A picture only {he} can see, waiting to be painted.', ['creative']], ['{He} half-remembers a song {he} has never heard.', ['virtuous', 'dreamer']],
  ['An old promise to a friend {he} lost touch with.', ['kind', 'quiet']], ['{He} wonders whether {he} was born to be more than {he} is.', ['stubborn', 'adventurous', 'hardworking']],
];

const REL_NOTES = {
  partner: ['Trusts {his} judgement completely.', 'Would walk through fire for {him}.', 'Still smiles when {he} walks into the room.', 'Wishes {he} would slow down once in a while.', 'Knows {him} better than anyone.', 'Argues with {him} nightly and wouldn’t change a thing.'],
  parent: ['Wants a better life for {him}.', 'Worries about those wild ideas.', 'Proud of {him}, though {he} rarely says it.', 'Sees so much of themselves in {him}.', 'Lies awake wondering what {he} will become.'],
  child: ['Wants to make {him} proud.', 'Loves {his} stories, hates {his} rules.', 'Thinks {he} knows everything.', 'Feels safest when {he} is near.', 'Tries to hide trouble from {him}, never successfully.'],
  sibling: ['Rival and best friend in one.', 'Shares everything, including the blame.', 'Knows exactly which buttons to press.'],
};
const TRAIT_REL = { quiet: 'Wishes {he} would talk more.', sociable: 'Adores {his} warmth and company.', 'short-tempered': 'Learned long ago when to leave {him} alone.', lazy: 'Wishes {he} would get out of bed sooner.', hardworking: 'Worries {he} works too hard.', kind: 'Is quietly grateful for {his} kindness.', mischievous: 'Never knows what {he} will do next.' };

// where people begin the day (the sim snaps them to the nearest walkable spot)
const SPAWNS = [{ x: 0.4, z: 0.7 }, { x: 1.0, z: -1.8 }, { x: -2.4, z: 1.2 }, { x: -1.0, z: 2.0 }, { x: 2.6, z: 1.6 }, { x: -0.5, z: -0.8 }];
const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];

// ---- helpers ----------------------------------------------------------------------------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function say(tpl, c, extra = {}) {
  const f = c.gender === 'f';
  const w = { N: c.name, he: f ? 'she' : 'he', He: f ? 'She' : 'He', his: f ? 'her' : 'his', him: f ? 'her' : 'him', job: (c.job?.title || 'villager').toLowerCase(), ...extra };
  return tpl.replace(/\{(\w+)\}/g, (_, k) => w[k] ?? '');
}
const dateLabel = (season, year) => `${SEASONS[season]} ${year}`;
const bornDate = (rng, age) => { const s = rng.int(0, 3); return { season: s, year: START_DATE.year - age - (s > START_DATE.season ? 1 : 0) }; };
const dateKey = (label) => { const [s, y] = label.split(' '); return +y * 4 + SEASONS.indexOf(s); };

// ---- trait / taste / skill choice -------------------------------------------------------------------------------
function chooseTraits(rng, count) {
  const pool = Object.keys(TRAITS), picked = [];
  for (const t of rng.shuffle(pool)) {
    if (picked.length >= count) break;
    if (picked.some((p) => CLASHES.some(([a, b]) => (a === p && b === t) || (a === t && b === p)))) continue;
    picked.push(t);
  }
  return picked;
}
const traitAffinity = (traits, tag) => traits.reduce((m, t) => m * (TRAITS[t].weights?.[tag] ?? 1), 1);

function chooseTastes(rng, c) {
  const tags = Object.keys(TAGS);
  const jobTags = (c.job?.skills || []).map((s) => TAG_OF_SKILL[s]).filter(Boolean);
  const likeCount = c.age < 14 ? 2 : rng.int(2, 3);
  const likes = [];
  while (likes.length < likeCount) {
    const t = rng.weighted(tags.filter((x) => !likes.includes(x)), (x) => 0.35 + (traitAffinity(c.traits, x) - 1) * 4 + (jobTags.includes(x) ? 1.2 : 0) + (x === 'sleeping' || x === 'eating' ? -0.2 : 0));
    likes.push(t);
  }
  const dislikes = [];
  const dCount = rng.chance(0.25) ? 2 : 1;
  const cands = tags.filter((x) => !likes.includes(x) && !jobTags.includes(x) && x !== 'eating' && x !== 'sleeping');
  while (dislikes.length < dCount && cands.length) {
    const t = rng.weighted(cands.filter((x) => !dislikes.includes(x)), (x) => 0.4 + Math.max(0, 1 - traitAffinity(c.traits, x)) * 6);
    dislikes.push(t);
    if (dislikes.length >= cands.length) break;
  }
  return { likes, dislikes };
}

function chooseSkills(rng, c) {
  const skills = {};
  const adult = c.age >= 16, maturity = adult ? clamp(Math.floor((c.age - 16) / 7), 0, 6) : 0;
  for (const s of c.job?.skills || []) skills[s] = clamp(2 + maturity + rng.int(-1, 2), 1, 8);
  for (const l of c.likes) {
    const s = SKILL_OF_TAG[l];
    if (s && skills[s] == null) skills[s] = adult ? rng.int(1, 3 + Math.min(2, maturity)) : rng.int(0, 2);
  }
  if (c.traits.includes('fit') && skills.fighting == null && rng.chance(0.5)) skills.fighting = rng.int(0, 2);
  if (c.traits.includes('mystical') && skills.magic == null && rng.chance(0.4)) skills.magic = rng.int(0, 1);
  return skills;
}

function chooseJob(rng, c) {
  const scored = (j) => 0.4 + j.traits.filter((t) => c.traits.includes(t)).length * 2 + (c.gender === 'm' && j.title === 'Midwife' ? 0 : 0);
  return rng.weighted(JOBS, scored);
}

// ---- look -------------------------------------------------------------------------------------------------------
function chooseLook(rng, c) {
  const kid = c.age < 14, elder = c.age >= 56, f = c.gender === 'f';
  const bias = (key, fallback) => { const opts = c.traits.flatMap((t) => FACE_BIAS[t]?.[key] || []); return opts.length && rng.chance(0.7) ? rng.pick(opts) : rng.pick(fallback); };
  const hairGroup = elder ? 'grey' : c.age > 46 && rng.chance(0.4) ? 'grey' : rng.pick(['dark', 'brown', 'brown', 'light', 'red', 'dark']);
  const hair = rng.pick(HAIR[hairGroup]);
  const hairStyles = kid ? (f ? ['pigtails', 'messy', 'bob', 'twinbuns', 'braids'] : ['messy', 'short', 'shaggy', 'bob'])
    : f ? ['long', 'braid', 'braids', 'bun', 'bob', 'ponytail', 'curly', 'puff', 'twinbuns', 'short'] : ['short', 'short', 'shaggy', 'curly', 'topknot', 'messy', 'ponytail', 'receding', 'bald'];
  let hairStyle = rng.pick(hairStyles);
  if (elder && !f && rng.chance(0.4)) hairStyle = rng.pick(['receding', 'bald']);
  const L = {
    skin: rng.pick(SKIN), hair, hairStyle,
    headW: +rng.range(0.92, 1.12).toFixed(2), jaw: bias('jaw', ['round', 'soft', 'square', 'pointy']),
    eyes: bias('eyes', ['dot', 'big', 'wide', 'sleepy', 'narrow', 'happy']), eyeColor: rng.pick(EYE_COLORS),
    brows: bias('brows', ['thin', 'thick', 'arched', 'bushy', 'worried']), nose: rng.pick(['button', 'button', 'big', 'long', 'pointy', 'hook']),
    mouth: bias('mouth', ['smile', 'flat', 'smirk', 'grin', 'open']), blush: rng.chance(0.7), freckles: kid && rng.chance(0.6) ? rng.int(4, 12) : rng.chance(0.12) ? rng.int(4, 8) : 0,
    outfit: kid ? (f ? 'dress' : 'tunic') : f ? rng.pick(['gown', 'dress', 'gown']) : rng.pick(['tunic', 'tunic', 'jerkin']),
    shirt: rng.pick(SHIRTS), pants: rng.pick(PANTS), build: kid ? 1 : +clamp(rng.range(0.85, 1.25) + (c.traits.includes('fit') ? 0.12 : 0) + (c.traits.includes('hearty') ? 0.1 : 0), 0.82, 1.38).toFixed(2),
    accessories: [],
  };
  if (elder) L.blush = false;
  if (L.jaw === 'square' && L.build < 1) L.build = +(L.build + 0.1).toFixed(2);
  if (c.gender === 'm' && !kid && c.age >= 22 && rng.chance(0.5)) { L.facial = rng.pick(FACIAL); if (rng.chance(0.3)) L.facialColor = hair; }
  const hint = c.job?.look || {};
  if (!kid) {
    if (hint.outfit) L.outfit = hint.outfit;
    if (f && L.outfit === 'jerkin') L.outfit = 'gown';
    if (L.outfit === 'noble') { L.trim = rng.pick([0xf0cd76, 0xe0b24a, 0x9a3a5a]); }
    if (L.outfit === 'jerkin') L.trim = rng.pick([0x4a6a9a, 0x9a3a5a, 0x4a7a5a, 0xb8433f]);
    if (hint.headwear) { L.headwear = hint.headwear; L.headwearColor = hint.headwear === 'bakerhat' ? 0xf4eee2 : hint.headwear === 'pointed' ? 0x4a3a8a : rng.pick(HAT_COLORS); }
    else if (rng.chance(0.3)) { L.headwear = rng.pick(f ? ['coif', 'kerchief', 'hood', 'strawhat'] : ['flatcap', 'hood', 'strawhat']); L.headwearColor = rng.pick(HAT_COLORS); }
    if (rng.chance(0.14)) L.cloak = rng.pick(CLOAKS);
    for (const a of hint.accessories || []) L.accessories.push(a);
    if (!L.accessories.includes('glasses') && rng.chance(c.job?.skills.includes('lore') ? 0.3 : 0.08)) L.accessories.push('glasses');
    if (rng.chance(c.traits.includes('fit') || c.traits.includes('short-tempered') ? 0.22 : 0.07)) L.accessories.push('scar');
    if (f && rng.chance(0.25)) L.accessories.push('earring');
    if (!f && rng.chance(0.08)) L.accessories.push('earring');
    if (c.traits.includes('creative') && rng.chance(0.4)) { L.accessories.push('headband'); L.trim = rng.pick([0xb8433f, 0x4f7a9c, 0x5f8a58]); }
    if (L.hairStyle === 'bald' && !L.headwear && !L.facial) L.facial = 'mustache';
  } else if (rng.chance(0.4)) { L.headwear = rng.pick(['hood', 'flatcap', 'kerchief']); L.headwearColor = rng.pick(HAT_COLORS); }
  if (L.headwear === 'hood' && L.hairStyle === 'bald') L.hairStyle = 'short';
  return L;
}

// ---- goals ------------------------------------------------------------------------------------------------------
const MASTERY = {
  cooking: ['Finest cook in the valley', 'Feed the whole village at the midwinter feast.', 'Cook'], herbalism: ['Master of remedies', 'Become the finest herb-wife in the valley.', 'Herbalism'],
  music: ['A song for the ages', 'Compose something the whole valley will sing.', 'Music'], lore: ['A learned mind', 'Read everything worth reading and understand it.', 'Lore'],
  fighting: ['A true swordsman', 'Become someone no bully dares to cross.', 'Fighting'], fishing: ['The one that didn’t get away', 'Land the legendary old pike of the river bend.', 'Fishing'],
  painting: ['A masterpiece', 'Paint one picture that people travel to see.', 'Painting'],
};
const TAG_STEP = { cooking: 'Cook a stew for the family', gardening: 'Tend the herbs often', music: 'Play a tune on the harp', reading: 'Study the old books', 'sword-fighting': 'Practise swordplay', fishing: 'Spend time at the pond', painting: 'Paint at the easel' };
function masteryGoal(c) {
  const skill = TRAINABLE.map((s) => ({ s, w: (c.skills[s] ?? 0) + (c.likes.includes(TAG_OF_SKILL[s]) ? 3 : 0) + (c.job?.skills.includes(s) ? 1 : 0) })).sort((a, b) => b.w - a.w)[0].s;
  const [title, desc, name] = MASTERY[skill], cur = c.skills[skill] ?? 0, tag = TAG_OF_SKILL[skill];
  const a = clamp(cur + 2, 2, 10), b = clamp(cur + 4, a + 1, 10);
  return { id: `master-${skill}`, title, desc, steps: [
    { text: TAG_STEP[tag], check: { tag, n: 4 } }, { text: `Reach ${name} level ${a}`, check: { skill, level: a } }, { text: `Reach ${name} level ${b}`, check: { skill, level: b } }] };
}
function bondGoal(c, other, rel) {
  return { id: `close-${other.id}`, title: c.age < 14 ? 'A happy home' : 'A warm, full home', desc: 'Keep the family fed and together through the winter.', steps: [
    { text: 'Cook a stew for the family', check: { tag: 'cooking', n: 3 } }, { text: 'Share six meals at the table', check: { tag: 'eating', n: 6 } },
    { text: `Grow close to ${other.name}`, check: { aff: { with: other.id, min: clamp(Math.round(rel.aff) + 8, 60, 96) } } }] };
}
function heroGoal(c) {
  return { id: 'hero', title: 'Become a hero', desc: `${c.name} will be a famous hero one day, whatever the grown-ups say.`, steps: [
    { text: 'Hear the heroes’ tales', check: { tag: 'tales', n: 4 } }, { text: 'Get a sword', check: { flag: `sword-${c.id}` } }, { text: 'Learn to fight', check: { skill: 'fighting', level: 2 } }, { text: 'Slip away on a quest', check: { flag: `quest-${c.id}` } }] };
}

// ---- one person -------------------------------------------------------------------------------------------------
function makePerson(rng, spec, used) {
  const gender = spec.gender || rng.pick(['m', 'f']);
  const name = rng.pick(NAMES[gender].filter((n) => !used.has(n)));
  used.add(name);
  const c = { gender, name, age: spec.age, role: spec.role };
  c.traits = chooseTraits(rng, c.age < 14 || rng.chance(0.25) ? (rng.chance(0.2) ? 4 : 3) : 3);
  c.job = c.age >= 14 ? chooseJob(rng, c) : null;
  Object.assign(c, chooseTastes(rng, c));
  c.skills = chooseSkills(rng, c);
  return c;
}

function finish(rng, c, id) {
  const kid = c.age < 14, jobDef = c.job;
  const look = chooseLook(rng, c);
  const bioParts = c.traits.slice(0, 2).map((t) => say(BIO[t], c));
  bioParts.push(say(rng.pick(kid ? BIO_END.child : BIO_END.adult), c));
  const future = kid ? rng.shuffle(JOBS).sort((a, b) => b.traits.filter((t) => c.traits.includes(t)).length - a.traits.filter((t) => c.traits.includes(t)).length).slice(0, 3).map((j) => j.title) : null;
  if (kid && c.traits.includes('adventurous') && !future.includes('Hero?')) future[2] = 'Hero?';
  const job = kid
    ? { title: c.age < 6 ? 'Little one' : 'Child', place: null, hours: null, wage: 0, skills: [], note: c.age < 6 ? 'Far too young to work. Mostly eats, naps and explores.' : `Too young to work. At twelve, ${c.name} may be taken on as an apprentice.`, future }
    : { title: jobDef.title, place: jobDef.place, hours: [...jobDef.hours], wage: jobDef.wage + (c.age > 40 ? 1 : 0), skills: [...jobDef.skills], note: jobDef.note };
  const born = bornDate(rng, c.age);
  const history = [{ date: dateLabel(born.season, born.year), icon: '🍼', text: kid ? 'Born in the Eastwood cottage.' : rng.pick(['Born in the Eastwood to a hard-working family.', 'Born in the village, to a family of no particular note.', 'Born at the edge of the Eastwood in a snowstorm.']) }];
  if (!kid) {
    const start = rng.int(14, 18), ys = born.year + start;
    history.push({ date: dateLabel(rng.int(0, 3), ys), icon: jobDef.icon, text: `Took up work as a ${jobDef.title.toLowerCase()}.` });
  }
  const tr = c.traits.find((t) => TRAIT_EVENTS[t]);
  if (tr && c.age >= 5) { const [icon, text] = TRAIT_EVENTS[tr]; history.push({ date: dateLabel(rng.int(0, 3), born.year + rng.int(4, Math.min(c.age, 16))), icon, text }); }
  const bio = bioParts.join(' ');
  const scale = kid ? +(0.58 + c.age * 0.0095).toFixed(2) : +clamp((c.gender === 'f' ? 0.95 : 1.02) + rng.range(-0.06, 0.06), 0.88, 1.12).toFixed(2);
  const headScale = kid ? +(1.3 - c.age * 0.0114).toFixed(2) : 1;
  return {
    id, name: c.name, role: c.role, species: 'human', gender: c.gender, age: c.age, scale, headScale, look, start: { ...SPAWNS[0], yaw: rng.range(-3, 3) },
    bio, traits: c.traits, likes: c.likes, dislikes: c.dislikes, skills: c.skills, relations: [], goals: [], dream: null, job, history,
  };
}

// ---- household --------------------------------------------------------------------------------------------------
const KINDS = [['family', 5], ['single-parent', 2], ['couple', 1.2], ['siblings', 1]];

export function generateHousehold(seed = Date.now(), opts = {}) {
  const rng = makeRng(seed), used = new Set();
  const kind = opts.kind || rng.weighted(KINDS, (k) => k[1])[0];
  const kids = kind === 'family' || kind === 'single-parent' ? rng.int(1, 2) : 0;
  const parentAge = rng.int(26, 48);
  const people = [];   // internal: { c, rel: [{ to, type }] }
  const add = (spec) => { const c = makePerson(rng, spec, used); people.push(c); return c; };

  let adults = [];
  if (kind === 'siblings') {
    const a = add({ age: rng.int(24, 40), role: 'Sibling' }), b = add({ age: a.age + rng.int(-6, 6), role: 'Sibling' });
    adults = [a, b];
  } else {
    const first = add({ age: parentAge, role: 'Parent' });
    adults.push(first);
    if (kind !== 'single-parent') adults.push(add({ age: clamp(parentAge + rng.int(-5, 5), 22, 60), role: 'Partner', gender: rng.chance(0.88) ? (first.gender === 'm' ? 'f' : 'm') : first.gender }));
  }
  const children = [];
  for (let i = 0; i < kids; i++) children.push(add({ age: rng.int(2, Math.min(13, parentAge - 20)), role: 'Child' }));
  for (const a of adults) a.role = kind === 'siblings' ? (a.gender === 'f' ? 'Sister' : 'Brother') : kind === 'couple' ? (a.gender === 'f' ? 'Wife' : 'Husband') : a.gender === 'f' ? 'Mother' : 'Father';
  for (const k of children) k.role = k.age < 6 ? 'Little one' : 'Child';

  // ids
  const idOf = new Map(); const taken = new Set();
  for (const c of people) { let id = c.name.toLowerCase(); while (taken.has(id)) id += '2'; taken.add(id); idOf.set(c, id); }

  const defs = people.map((c) => finish(rng, c, idOf.get(c)));
  const def = new Map(people.map((c, i) => [c, defs[i]]));
  const D = (c) => def.get(c);

  // relationships (both directions) + shared life events
  const rel = (from, to, label, aff, notePool, tokens) => {
    const traitNote = rng.chance(0.55) && to.traits.find((t) => TRAIT_REL[t]);
    const tpl = traitNote ? TRAIT_REL[traitNote] : rng.pick(notePool);
    D(from).relations.push({ with: idOf.get(to), label, aff, note: say(tpl, to, tokens) });
  };
  const spouseLabel = (c) => (c.gender === 'f' ? 'Wife' : 'Husband'), kidLabel = (c) => (c.gender === 'f' ? 'Daughter' : 'Son'), parLabel = (c) => (c.gender === 'f' ? 'Mother' : 'Father'), sibLabel = (c) => (c.gender === 'f' ? 'Sister' : 'Brother');
  if (kind === 'siblings') {
    const [a, b] = adults, aff = rng.int(55, 80);
    rel(a, b, sibLabel(b), aff + rng.int(-5, 5), REL_NOTES.sibling); rel(b, a, sibLabel(a), aff + rng.int(-5, 5), REL_NOTES.sibling);
  } else if (adults.length === 2) {
    const [a, b] = adults, aff = rng.int(66, 90);
    rel(a, b, spouseLabel(b), aff + rng.int(-4, 4), REL_NOTES.partner); rel(b, a, spouseLabel(a), aff + rng.int(-4, 4), REL_NOTES.partner);
    const season = rng.int(0, 3), oldest = Math.max(...children.map((k) => k.age), 0);
    const marriageYear = clamp(START_DATE.year - Math.max(oldest + rng.int(1, 3), rng.int(2, 12)), START_DATE.year - Math.min(a.age, b.age) + 18, START_DATE.year - oldest - 1);
    for (const p of [a, b]) D(p).history.push({ date: dateLabel(season, marriageYear), icon: '💍', text: `Married ${(p === a ? b : a).name} at the village green.` });
  }
  for (const k of children) {
    const born = bornDate(rng, k.age), parents = adults.filter(() => kind !== 'siblings');
    for (const p of parents) {
      rel(p, k, kidLabel(k), rng.int(78, 94), REL_NOTES.parent); rel(k, p, parLabel(p), rng.int(76, 94), REL_NOTES.child);
      D(p).history.push({ date: dateLabel(born.season, born.year), icon: '👶', text: parents.length === 1 || p.gender === 'm' ? `${p.gender === 'f' ? 'Gave birth to' : 'Welcomed'} ${k.name}.` : `Gave birth to ${k.name}.` });
    }
  }
  if (children.length === 2) {
    const [a, b] = children;
    rel(a, b, sibLabel(b), rng.int(55, 80), REL_NOTES.sibling); rel(b, a, sibLabel(a), rng.int(55, 80), REL_NOTES.sibling);
  }

  // goals + dreams (need relations for the bond goal)
  for (const c of people) {
    const d = D(c), cs = { ...c, id: idOf.get(c), skills: Object.fromEntries(Object.entries(c.skills)) };
    const goals = [];
    const closest = [...d.relations].sort((x, y) => y.aff - x.aff)[0];
    const hero = c.age < 17 && (c.traits.includes('adventurous') || (c.traits.includes('fit') && rng.chance(0.5)));
    if (hero) goals.push(heroGoal({ ...cs, name: c.name }));
    else if (closest && c.age < 14 && rng.chance(0.5)) goals.push(bondGoal(cs, { id: closest.with, name: people.find((p) => idOf.get(p) === closest.with).name }, closest));
    else goals.push(masteryGoal(cs));
    if (!hero && c.age >= 20 && closest && rng.chance(0.45) && !goals.some((g) => g.id.startsWith('close-'))) goals.push(bondGoal(cs, { id: closest.with, name: people.find((p) => idOf.get(p) === closest.with).name }, closest));
    d.goals = goals;
    if (c.age >= 18 && rng.chance(0.55)) {
      const opts = DREAMS.filter(([, need]) => !need.length || need.some((t) => c.traits.includes(t)));
      d.dream = say(rng.pick(opts)[0], c);
    }
    d.history.sort((x, y) => dateKey(x.date) - dateKey(y.date));
  }
  const spawns = rng.shuffle(SPAWNS);
  defs.forEach((d, i) => { d.start = { ...spawns[i % spawns.length], yaw: rng.range(-3, 3) }; });
  defs.seed = seed; defs.kind = kind;
  return defs;
}

export const GENERATOR_TABLES = { JOBS, NAMES, BIO, TRAIT_EVENTS };
