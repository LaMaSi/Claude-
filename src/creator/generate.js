// Character creator logic: drafts, randomisers, validation, finalising into game characters, home layout. Pure (no DOM).
import { STAGES, STAGE_IDS, bodyFor } from '../data/stages.js';
import { TRAITS, TAGS, SKILLS } from '../data/traits.js';
import { START_DATE } from '../data/family.js';
import * as D from '../data/creator.js';
import { startHouse } from '../data/startHouse.js';
import { FURNITURE } from '../data/furniture.js';
import { buildNav } from '../sim/nav.js';

export const { MAX_MEMBERS, MAX_INFANTS, MAX_TRAITS, MAX_LIKES, MAX_DISLIKES, MAX_SKILLS } = D;
export const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const chance = (rng, p) => rng() < p;
const between = (rng, a, b) => a + rng() * (b - a);
const int = (rng, a, b) => Math.floor(between(rng, a, b + 1));
const weighted = (rng, items, w) => { const ws = items.map(w); let r = rng() * ws.reduce((a, b) => a + b, 0); for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; } return items[items.length - 1]; };
let uidCounter = 1; export const newUid = () => 'm' + uidCounter++;
export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'person';
export const conflicts = (a, b) => D.TRAIT_CONFLICTS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
export const conflictWith = (traits, t) => traits.find((o) => o !== t && conflicts(o, t)) || null;

// ---- random pieces ---------------------------------------------------------------------------------------------
export const randomAge = (rng, stage) => int(rng, ...STAGES[stage].ages.map((a, i) => (stage === 'senior' && i === 1 ? 78 : a)));
export function randomName(rng, taken = []) { for (let i = 0; i < 40; i++) { const n = pick(rng, D.NAMES); if (!taken.includes(n)) return n; } return pick(rng, D.NAMES) + int(rng, 2, 9); }

export function randomLook(rng, stage, prev = {}) {
  const o = (f) => D.optionsFor(stage, f), old = stage === 'senior';
  const hair = old && chance(rng, 0.65) ? pick(rng, [0x8a8a8e, 0xd8d8dc, 0xeeeeee]) : pick(rng, D.HAIR_COLORS)[1];
  const outfit = pick(rng, o('outfit'));
  let headwear = chance(rng, 0.3) ? pick(rng, o('headwear').filter(Boolean)) : null;
  if (headwear === 'helm' && outfit !== 'knight') headwear = null;
  if (outfit === 'knight' && stage === 'adult' && chance(rng, 0.4)) headwear = 'helm';
  const acc = []; for (const a of o('accessories')) if (chance(rng, a === 'earring' ? 0.15 : 0.1)) acc.push(a);
  const cloth = pick(rng, D.CLOTH_COLORS)[1];
  return {
    ...prev, skin: pick(rng, D.SKINS)[1], hair, hairStyle: pick(rng, o('hairStyle')), headwear, headwearColor: pick(rng, [0xf0e8d4, 0x5f8a58, 0xb8433f, 0x4f7a9c, 0x7a5a3a, 0xd9a441]),
    headW: +between(rng, 0.94, 1.1).toFixed(2), headH: +between(rng, 0.95, 1.06).toFixed(2), jaw: pick(rng, o('jaw')), chin: +between(rng, -0.3, 0.5).toFixed(2), cheek: +between(rng, 0, 0.15).toFixed(2), brow: +between(rng, 0, 0.35).toFixed(2),
    eyes: pick(rng, o('eyes')), eyeColor: pick(rng, D.EYE_COLORS)[1], eyeGap: +between(rng, 0.062, 0.078).toFixed(3), eyeSize: +between(rng, 0.95, 1.15).toFixed(2), eyeTilt: +between(rng, -0.2, 0.25).toFixed(2),
    brows: pick(rng, o('brows')), nose: pick(rng, o('nose')), mouth: pick(rng, o('mouth')), ears: pick(rng, o('ears').filter((e) => e !== 'pointy' || chance(rng, 0.08))), blush: chance(rng, 0.7), freckles: chance(rng, 0.25) ? int(rng, 4, 12) : 0,
    facial: stage === 'adult' || stage === 'senior' ? (chance(rng, 0.35) ? pick(rng, o('facial').filter((f) => f !== 'none')) : 'none') : 'none', accessories: acc,
    outfit, shirt: cloth, pants: pick(rng, [0x6b5a48, 0x4b5b8a, 0x5a4a3a, 0x7a6a58, 0x3f4a3a]), trim: pick(rng, [0xe0b24a, 0xb8433f, 0x4a6a9a, 0x4a7a5a]), apron: chance(rng, 0.7), build: +between(rng, 0.88, 1.25).toFixed(2), cloak: stage !== 'infant' && chance(rng, 0.12) ? pick(rng, [0x4a3f55, 0x2f6a6a, 0x7a2a2a, 0x5a4a3a]) : null,
  };
}
export function randomTraits(rng, stage) {
  const n = stage === 'infant' ? 1 : stage === 'child' ? 2 : int(rng, 2, 3), out = [], keys = Object.keys(TRAITS);
  for (let i = 0; i < 40 && out.length < n; i++) { const t = pick(rng, keys); if (!out.includes(t) && !conflictWith(out, t)) out.push(t); }
  return out;
}
export function randomLikes(rng, stage, traits = []) {
  const tags = Object.keys(TAGS), nl = stage === 'infant' ? 1 : int(rng, 2, 3), nd = stage === 'infant' ? 0 : int(rng, 1, 2), likes = [], dislikes = [];
  for (const t of traits) for (const g of Object.keys(TAGS)) if (TRAITS[t].weights?.[g] > 1.2 && likes.length < nl && !likes.includes(g) && chance(rng, 0.5)) likes.push(g);
  while (likes.length < nl) { const t = pick(rng, tags); if (!likes.includes(t)) likes.push(t); }
  while (dislikes.length < nd) { const t = pick(rng, tags); if (!likes.includes(t) && !dislikes.includes(t)) dislikes.push(t); }
  return { likes, dislikes };
}
const SKILL_OF_TAG = { music: 'music', reading: 'lore', tales: 'lore', cooking: 'cooking', gardening: 'herbalism' };
export function randomSkills(rng, stage, likes = []) {
  if (stage === 'infant') return {};
  if (stage === 'child') return chance(rng, 0.5) ? { [pick(rng, ['music', 'lore', 'cooking', 'herbalism'])]: 1 } : {};
  const keys = Object.keys(SKILLS), n = int(rng, 1, 2), out = {}, [lo, hi] = stage === 'senior' ? [4, 7] : [2, 5];
  while (Object.keys(out).length < n) { const k = weighted(rng, keys, (s) => (likes.some((l) => SKILL_OF_TAG[l] === s) ? 4 : s === 'magic' ? 0.3 : 1)); out[k] = int(rng, lo, hi); }
  return out;
}
export function randomBio(rng, m) {
  const n = m.name || 'This one', p = pick(rng, D.PLACES), sub = (s) => s.replace(/{n}/g, n).replace(/{p}/g, p).replace(/{self}/g, 'themselves');
  if (m.stage === 'infant') return sub(pick(rng, D.BABY_LINES));
  const parts = [sub(pick(rng, D.ORIGINS))];
  if (m.stage !== 'child') parts.push(sub(pick(rng, D.EVENTS))); else parts.push(sub(pick(rng, D.CHILD_LINES)));
  for (const t of m.traits.slice(0, 2)) parts.push(sub(D.TRAIT_LINES[t]));
  if (m.stage === 'senior') parts.push(sub(pick(rng, D.SENIOR_LINES)));
  return parts.join(' ');
}
export function goalChoices(m, members) {
  const others = members.filter((o) => o.uid !== m.uid && o.stage !== 'infant');
  return D.GOALS.filter((g) => g.stages.includes(m.stage) && (!g.needsOther || others.length));
}
export function randomGoal(rng, m, members) {
  if (m.stage === 'infant') return null;
  const opts = goalChoices(m, members);
  return weighted(rng, opts, (g) => 1 + (g.likes || []).filter((l) => m.likes.includes(l)).length * 2 + (g.traits || []).filter((t) => m.traits.includes(t)).length * 2).id;
}

export function randomMember(rng, stage, members = []) {
  stage = stage || weighted(rng, STAGE_IDS, (s) => ({ infant: 0.5, child: 1.5, adult: 3, senior: 1 }[s]));
  const age = randomAge(rng, stage), name = randomName(rng, members.map((x) => x.name)), traits = randomTraits(rng, stage), { likes, dislikes } = randomLikes(rng, stage, traits);
  const m = { uid: newUid(), name, stage, age, heightK: +rng().toFixed(2), look: randomLook(rng, stage), traits, likes, dislikes, skills: randomSkills(rng, stage, likes), bio: '', goalId: null, dream: null, locks: {} };
  m.bio = randomBio(rng, m); m.goalId = randomGoal(rng, m, [...members, m]); m.dream = stage !== 'infant' && chance(rng, 0.55) ? pick(rng, D.DREAMS) : null;
  return m;
}

/** Re-roll one field (or group of fields) of a member, honouring locks. */
export function rerollField(rng, m, field, members = []) {
  const stage = m.stage;
  const set = (patch) => Object.assign(m.look, patch);
  const L = randomLook(rng, stage);
  const groups = {
    name: () => { m.name = randomName(rng, members.filter((x) => x !== m).map((x) => x.name)); },
    age: () => { m.age = randomAge(rng, stage); },
    skin: () => set({ skin: L.skin }), jaw: () => set({ jaw: L.jaw, chin: L.chin, cheek: L.cheek, brow: L.brow, headW: L.headW, headH: L.headH }),
    eyes: () => set({ eyes: L.eyes, eyeSize: L.eyeSize, eyeTilt: L.eyeTilt, eyeGap: L.eyeGap }), eyeColor: () => set({ eyeColor: L.eyeColor }), brows: () => set({ brows: L.brows }), nose: () => set({ nose: L.nose }),
    mouth: () => set({ mouth: L.mouth }), ears: () => set({ ears: L.ears }), freckles: () => set({ freckles: L.freckles }), hairStyle: () => set({ hairStyle: L.hairStyle }), hair: () => set({ hair: L.hair }),
    facial: () => set({ facial: L.facial }), headwear: () => set({ headwear: L.headwear, headwearColor: L.headwearColor }), outfit: () => set({ outfit: L.outfit, apron: L.apron, cloak: L.cloak }),
    shirt: () => set({ shirt: L.shirt, pants: L.pants, trim: L.trim }), accessories: () => set({ accessories: L.accessories }), build: () => { m.heightK = +rng().toFixed(2); set({ build: L.build }); },
    traits: () => { m.traits = randomTraits(rng, stage); }, likes: () => { Object.assign(m, randomLikes(rng, stage, m.traits)); }, skills: () => { m.skills = randomSkills(rng, stage, m.likes); },
    bio: () => { m.bio = randomBio(rng, m); }, goal: () => { m.goalId = randomGoal(rng, m, members); }, dream: () => { m.dream = stage !== 'infant' && chance(rng, 0.55) ? pick(rng, D.DREAMS) : null; },
  };
  groups[field]?.();
  return m;
}
export const ALL_FIELDS = ['name', 'age', 'skin', 'jaw', 'eyes', 'eyeColor', 'brows', 'nose', 'mouth', 'ears', 'freckles', 'hairStyle', 'hair', 'facial', 'headwear', 'outfit', 'shirt', 'accessories', 'build', 'traits', 'likes', 'skills', 'bio', 'goal', 'dream'];
/** Randomise a member, keeping every locked field. */
export function randomizeMember(rng, m, members = []) {
  for (const f of ALL_FIELDS) if (!m.locks[f]) rerollField(rng, m, f, members);
  // keep dependent text consistent
  if (!m.locks.bio) m.bio = randomBio(rng, m);
  return m;
}
/** Change a member's life stage, fixing anything that no longer applies. */
export function setStage(rng, m, stage) {
  m.stage = stage; const [a, b] = STAGES[stage].ages; if (m.age < a || m.age > b) m.age = Math.round((a + b) / 2);
  const L = m.look;
  for (const f of ['hairStyle', 'headwear', 'facial', 'outfit', 'mouth', 'brows']) { const o = D.optionsFor(stage, f); if (!o.includes(L[f])) L[f] = f === 'headwear' ? null : f === 'facial' ? 'none' : pick(rng, o); }
  L.accessories = L.accessories.filter((a) => D.optionsFor(stage, 'accessories').includes(a));
  if (stage === 'infant' || stage === 'child') L.cloak = null;
  if (stage === 'infant') { m.traits = m.traits.slice(0, 1); m.dislikes = []; m.skills = {}; m.goalId = null; m.dream = null; }
  else if (!m.goalId) m.goalId = randomGoal(rng, m, []);
  if (m.goalId && !D.GOALS.find((g) => g.id === m.goalId)?.stages.includes(stage)) m.goalId = randomGoal(rng, m, []);
  if (stage === 'child') for (const k of Object.keys(m.skills)) m.skills[k] = Math.min(m.skills[k], 1);
  return m;
}

// ---- households ------------------------------------------------------------------------------------------------
const TEMPLATES = [
  ['adult', 'adult', 'child'], ['adult', 'adult', 'child', 'infant'], ['adult', 'adult', 'child', 'child'], ['adult', 'child'], ['adult', 'infant'], ['adult', 'adult'], ['adult', 'senior'],
  ['adult', 'adult', 'infant'], ['adult', 'senior', 'child'], ['senior', 'adult', 'adult', 'child'], ['adult'], ['senior'], ['adult', 'child', 'child', 'infant'], ['adult', 'adult', 'adult'],
  ['adult', 'adult', 'child', 'child', 'infant'], ['senior', 'adult', 'adult', 'child', 'child', 'infant'], ['adult', 'adult', 'senior', 'child', 'child'],
];
export function randomHousehold(rng) {
  const stages = pick(rng, TEMPLATES), members = [];
  for (const s of stages) members.push(randomMember(rng, s, members));
  const d = { members, rels: {} };
  // keep the family plausible: the two oldest adults are the parents, at least 16 years older than any child
  const adults = members.filter((m) => m.stage === 'adult').sort((x, y) => y.age - x.age), kids = members.filter((m) => m.stage === 'child' || m.stage === 'infant');
  if (adults.length && kids.length) {
    const need = Math.max(...kids.map((k) => k.age)) + 16;
    for (const p of adults.slice(0, 2)) if (p.age < need) p.age = Math.min(54, need + int(rng, 0, 8));
    const oldest = adults[0].age;
    for (const k of kids) if (k.age > oldest - 16) k.age = Math.max(STAGES[k.stage].ages[0], Math.min(STAGES[k.stage].ages[1], oldest - 16));
  }
  const elders = members.filter((m) => m.stage === 'senior');
  if (adults.length) for (const e of elders) if (e.age < adults[0].age + 16) e.age = Math.min(85, adults[0].age + 16 + int(rng, 0, 6));
  for (const m of members) m.goalId = randomGoal(rng, m, members);
  resetRelations(d);
  return d;
}

const rank = { infant: 0, child: 1, adult: 2, senior: 3 };
export const relKey = (a, b) => `${a.uid}|${b.uid}`;
/** Default relationship codes for a household, from ages: parents, grandparents, siblings, partners. */
export function resetRelations(d) {
  const ms = d.members, adults = ms.filter((m) => m.stage === 'adult').sort((x, y) => y.age - x.age), seniors = ms.filter((m) => m.stage === 'senior'), kids = ms.filter((m) => m.stage === 'child' || m.stage === 'infant');
  d.rels = {};
  const set = (x, y, kind) => { // kind: partner|sibling|friend|housemate|parent (x is parent of y)|grand (x grandparent of y)
    const i = ms.indexOf(x), j = ms.indexOf(y); if (i < 0 || j < 0) return;
    const [a, b] = i < j ? [x, y] : [y, x];
    d.rels[relKey(a, b)] = kind === 'parent' || kind === 'grand' ? `${kind}:${i < j ? 'ab' : 'ba'}` : kind;
  };
  const parents = adults.slice(0, 2);
  for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) d.rels[relKey(ms[i], ms[j])] = 'friend';
  if (adults.length >= 2) set(adults[0], adults[1], 'partner');
  for (const k of kids) for (const p of parents) set(p, k, 'parent');
  for (const s of seniors) { for (const k of kids) set(s, k, parents.length ? 'grand' : 'parent'); if (adults[0]) set(s, adults[0], 'parent'); }
  for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) set(kids[i], kids[j], 'sibling');
  if (seniors.length >= 2) set(seniors[0], seniors[1], 'partner');
  return d;
}
export const relationOf = (d, a, b) => { const i = d.members.indexOf(a), j = d.members.indexOf(b); if (i === j) return null; const [x, y] = i < j ? [a, b] : [b, a]; return d.rels[relKey(x, y)] || 'housemate'; };

// ---- validation ------------------------------------------------------------------------------------------------
export function validate(d) {
  const errors = [], warnings = [], ms = d.members, infants = ms.filter((m) => m.stage === 'infant');
  if (!ms.length) errors.push('Add at least one person.');
  if (ms.length > MAX_MEMBERS) errors.push(`A household holds at most ${MAX_MEMBERS} people.`);
  if (ms.length && infants.length === ms.length) errors.push('A household of only infants cannot survive: add someone who can look after them.');
  if (infants.length > MAX_INFANTS) errors.push(`The cottage has room for ${MAX_INFANTS} cribs: ${infants.length} infants is too many.`);
  const names = ms.map((m) => m.name.trim().toLowerCase());
  if (ms.some((m) => !m.name.trim())) errors.push('Everyone needs a name.');
  else if (new Set(names).size < names.length) errors.push('Two people share the same name.');
  for (const m of ms) {
    if (m.traits.length > MAX_TRAITS) errors.push(`${m.name || 'Someone'} has more than ${MAX_TRAITS} traits.`);
    for (const t of m.traits) { const c = conflictWith(m.traits, t); if (c) { errors.push(`${m.name}: ${TRAITS[t].name} and ${TRAITS[c].name} cannot go together.`); break; } }
  }
  if (ms.length && !ms.some((m) => m.stage === 'adult' || m.stage === 'senior')) warnings.push('No grown-ups: the children will have to cook and care for each other alone.');
  const sleepers = ms.filter((m) => m.stage !== 'infant').length;
  if (ms.length) { const { sleepPlaces } = planHome(ms.map((m) => ({ stage: m.stage }))); if (sleepPlaces < sleepers) warnings.push(`The cottage has ${sleepPlaces} places to sleep for ${sleepers} people: some will sleep poorly.`); }
  return { errors, warnings, ok: errors.length === 0 };
}

// ---- turning a draft into game characters -----------------------------------------------------------------------
const START_SPOTS = [[0.4, 0.7], [1.0, -1.8], [-2.4, 1.2], [0.2, -0.4], [1.6, 1.6], [-0.3, 1.9], [2.4, 0.4], [-1.6, 0.0]];
const fill = (s, n, o = '') => s.replace(/{n}/g, n).replace(/{other}/g, o);
export function finalize(d, rng = Math.random, date = START_DATE) {
  const ms = d.members, ids = [], used = new Set();
  for (const m of ms) { let id = slug(m.name), k = 2; while (used.has(id)) id = `${slug(m.name)}-${k++}`; used.add(id); ids.push(id); }
  const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'], dateStr = (y, s) => `${SEASONS[s]} ${y}`;
  return ms.map((m, i) => {
    const body = bodyFor(m.stage, m.age, m.heightK), others = ms.map((o, j) => ({ o, j })).filter(({ o }) => o !== m);
    const goalOther = others.find(({ o }) => o.stage !== 'infant') ?? others[0];
    const rels = others.map(({ o, j }) => {
      const code = relationOf(d, m, o), R = D.RELATIONS[code], isA = i < j, [lo, hi] = R.aff;
      return { with: ids[j], label: isA ? R.ab : R.ba, aff: Math.round(between(rng, lo, hi)), note: R.note };
    });
    const tpl = m.goalId && D.GOALS.find((g) => g.id === m.goalId), oname = goalOther ? goalOther.o.name : '';
    const goals = tpl ? [{ id: tpl.id, title: fill(tpl.title, m.name, oname), desc: fill(tpl.desc, m.name, oname),
      steps: tpl.steps.map((s) => ({ text: fill(s.text, m.name, oname), check: s.check.aff ? { aff: { with: goalOther ? ids[goalOther.j] : '', min: s.check.aff.min } } : { ...s.check } })) }] : [];
    const top = Object.entries(m.skills).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none', J = D.JOBS[top] ?? D.JOBS.none;
    const job = m.stage === 'infant' ? { title: 'Infant', place: null, hours: null, wage: 0, skills: [], note: 'Far too young to do anything but grow.', future: [] }
      : m.stage === 'child' ? { title: 'Child', place: null, hours: null, wage: 0, skills: [], note: 'Too young to work. At twelve, an apprenticeship may come along.', future: ['Farmhand', 'Apprentice', 'Hero?'] }
      : { title: J.title, place: J.place, hours: m.stage === 'senior' ? [J.hours[0] + 1, J.hours[1] - 3] : J.hours, wage: m.stage === 'senior' ? Math.max(1, Math.round(J.wage * 0.6)) : J.wage, skills: top === 'none' ? [] : [top], note: J.note + (m.stage === 'senior' ? ' Keeps shorter hours now.' : '') };
    // role: from the relations in the household
    const kidsOf = others.filter(({ o, j }) => { const c = relationOf(d, m, o); return (i < j && c === 'parent:ab') || (i > j && c === 'parent:ba'); }).length;
    const grand = others.some(({ o, j }) => { const c = relationOf(d, m, o); return (i < j && c === 'grand:ab') || (i > j && c === 'grand:ba'); });
    const role = kidsOf ? 'Parent' : grand ? 'Grandparent' : { infant: 'Infant', child: 'Child', adult: 'Adult', senior: 'Elder' }[m.stage];
    // history: birth plus a couple of life events, in order
    const birthY = date.year - m.age, birthS = int(rng, 0, 3), place = pick(rng, D.PLACES);
    const hist = [{ date: dateStr(birthY, birthS), icon: '🍼', text: `Born in ${place}.` }];
    const nEv = m.stage === 'infant' ? 0 : m.stage === 'child' ? Math.min(2, Math.floor(m.age / 4)) : 2;
    const pool = (D.LIFE_EVENTS[m.stage === 'senior' ? 'senior' : m.stage] ?? []).slice();
    for (let k = 0; k < nEv && pool.length; k++) {
      const text = pool.splice(Math.floor(rng() * pool.length), 1)[0].replace('{p}', pick(rng, D.PLACES)).replace('{job}', job.title.toLowerCase()), y = birthY + Math.max(1, Math.floor(m.age * between(rng, 0.35, 0.95)));
      hist.push({ date: dateStr(Math.min(y, date.year - (m.stage === 'child' ? 0 : 1)), int(rng, 0, 3)), icon: '📜', text });
    }
    hist.sort((x, y) => parseInt(x.date.split(' ')[1]) - parseInt(y.date.split(' ')[1]));
    const [sx, sz] = START_SPOTS[i % START_SPOTS.length];
    return { id: ids[i], name: m.name.trim(), role, species: 'ray', stage: m.stage, age: m.age, scale: +body.scale.toFixed(3), headScale: +body.headScale.toFixed(3),
      look: JSON.parse(JSON.stringify(m.look)), start: { x: sx, z: sz, yaw: +(rng() * 6).toFixed(2) }, bio: m.bio, traits: m.traits.slice(), likes: m.likes.slice(), dislikes: m.dislikes.slice(),
      skills: { ...m.skills }, relations: rels, goals, dream: m.dream, job, history: hist };
  });
}

// ---- the home adapts to who lives in it -------------------------------------------------------------------------
export const CRIB_SPOTS = [{ x: -1.45, z: -1.45, rot: 0 }, { x: -0.65, z: -1.45, rot: 0 }];
export const PALLET_SPOTS = [{ x: 1.65, z: 1.25, rot: Math.PI / 2 }, { x: -1.35, z: -1.25, rot: 0 }, { x: 0.65, z: -1.5, rot: Math.PI / 2 }, { x: 0.65, z: 1.5, rot: Math.PI / 2 },
  { x: -0.35, z: -1.5, rot: Math.PI / 2 }, { x: -0.85, z: -0.5, rot: Math.PI / 2 }, { x: 0.15, z: -0.75, rot: 0 }, { x: 0.15, z: 0.75, rot: 0 }];
const toW = (it, lx, lz) => { const c = Math.cos(it.rot || 0), s = Math.sin(it.rot || 0); return { x: it.x + lx * c + lz * s, z: it.z - lx * s + lz * c }; };
function reachable(house) {
  const nav = buildNav(house, FURNITURE), door = { x: -5.2, z: 2.2 };
  for (const it of house.items) { const d = FURNITURE[it.def]; if (!d.use || d.use.redirect) continue;
    for (const s of d.use.slots) { const a = toW(it, d.use.approach[0] + (d.use.relX ? s.x : 0), d.use.approach[1]), t = nav.nearestWalkable(a.x, a.z); if (!t || !nav.findPath(door, t)) return false; } }
  return true;
}
/** Cribs for infants, straw pallets for sleepers beyond the bed's two places (as many as fit without blocking anything). */
export function planHome(people) {
  const infants = people.filter((p) => p.stage === 'infant').length, sleepers = people.length - infants;
  const items = [...startHouse.items].map((it) => ({ ...it }));
  for (let i = 0; i < Math.min(infants, CRIB_SPOTS.length); i++) items.push({ def: 'crib', ...CRIB_SPOTS[i] });
  let places = 2;
  for (const spot of PALLET_SPOTS) {
    if (places >= sleepers) break;
    const probe = buildNav({ ...startHouse, items }, FURNITURE), hw = spot.rot ? 0.95 : 0.35, hd = spot.rot ? 0.35 : 0.95;
    let clear = true; for (let x = spot.x - hw; x <= spot.x + hw && clear; x += 0.125) for (let z = spot.z - hd; z <= spot.z + hd; z += 0.125) if (!probe.walkable(x, z)) { clear = false; break; }
    if (clear && reachable({ ...startHouse, items: [...items, { def: 'pallet', ...spot }] })) { items.push({ def: 'pallet', ...spot }); places++; }
  }
  return { house: { ...startHouse, items }, sleepPlaces: places };
}
export const makeHouse = (defs) => planHome(defs);
