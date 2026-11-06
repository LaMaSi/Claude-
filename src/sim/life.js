// Personality, preferences, skills, wishes, goals, relationships, mood and history for each character.
// Pure logic (no rendering). sim.js calls these hooks; ui reads the resulting fields.
import { TRAITS, SKILLS, WISHES } from '../data/traits.js';
import { FURNITURE } from '../data/furniture.js';

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
export const dateText = (d) => `${SEASONS[d.season]} ${d.year}`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const prod = (c, fn) => c.traits.reduce((m, t) => m * (fn(TRAITS[t]) ?? 1), 1);
export const decayMult = (c, need) => prod(c, (t) => t.decay?.[need]);
const skillGain = (c) => prod(c, (t) => t.skillGain);
const relGain = (c) => prod(c, (t) => t.relGain);
const NEED_OF_TAG = { music: 'fun', reading: 'fun', tales: 'fun', cooking: 'hunger', eating: 'hunger', gardening: 'fun', bathing: 'hygiene', sleeping: 'sleep', resting: 'sleep', together: 'social', socializing: 'social', fishing: 'fun', 'sword-fighting': 'fun', painting: 'fun' };

export function log(c, sim, text, icon = '•') { c.history.push({ date: dateText(sim.date), icon, text, live: true }); }

export function initLife(c, def, sim) {
  c.bio = def.bio; c.traits = def.traits; c.likes = def.likes; c.dislikes = def.dislikes; c.job = def.job; c.dream = def.dream;
  c.skills = Object.fromEntries(Object.keys(SKILLS).map((k) => [k, { level: def.skills?.[k] ?? 0, xp: 0 }]));
  c.rel = Object.fromEntries((def.relations || []).map((r) => [r.with, { ...r }]));
  c.goals = def.goals.map((g) => ({ ...g, state: 'active', steps: g.steps.map((s) => ({ ...s, done: false })) }));
  c.history = def.history.map((h) => ({ ...h }));
  c.stats = { tags: {} }; c.wishes = []; c.mood = 0.7; c.boost = 0; c.togetherT = 0; c.session = null; c.goalTimer = 0;
  while (c.wishes.length < 3) addWish(c, sim);
}

// ---- preferences ----------------------------------------------------------------------------------------------
/** Multiplier on how much this person favours an activity (liked x2.2, disliked x0.3, trait weights). */
export function preferenceWeight(c, tags = []) {
  let w = 1;
  for (const t of tags) {
    if (c.likes.includes(t)) w *= 2.2;
    if (c.dislikes.includes(t)) w *= 0.3;
    w *= prod(c, (tr) => tr.weights?.[t]);
  }
  return w;
}

// ---- wishes ---------------------------------------------------------------------------------------------------
function addWish(c, sim) {
  const have = new Set(c.wishes.map((w) => w.id));
  const cands = WISHES.filter((w) => !have.has(w.id) && !c.dislikes.includes(w.tag));
  const weights = cands.map((w) => (1 + (c.likes.includes(w.tag) ? 3 : 0)) * (1 + (1 - (c.needs?.[w.need] ?? 0.6)) * 2.5) * (w.tag === 'together' ? 1.3 : 1));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0), pick = cands[cands.length - 1];
  for (let i = 0; i < cands.length; i++) { r -= weights[i]; if (r <= 0) { pick = cands[i]; break; } }
  if (pick) c.wishes.push({ id: pick.id, text: pick.text, tag: pick.tag, done: false, doneAt: 0 });
}
function fulfil(c, sim, tag) {
  const w = c.wishes.find((x) => !x.done && x.tag === tag);
  if (!w) return;
  w.done = true; w.doneAt = sim.time; c.boost = Math.min(1, c.boost + 0.6);
  log(c, sim, `Wish fulfilled: ${w.text.charAt(0).toLowerCase() + w.text.slice(1)}.`, '⭐');
}

// ---- sessions (time spent using a piece of furniture) ----------------------------------------------------------
function startSession(c) { const def = FURNITURE[c.use.item.def]; c.session = { def: c.use.item.def, tags: def.tags || [], trains: def.trains, t: 0 }; }
export function endSession(c, sim) {
  const s = c.session; c.session = null;
  if (!s || s.t < 5) return;
  for (const t of s.tags) { c.stats.tags[t] = (c.stats.tags[t] || 0) + 1; fulfil(c, sim, t); }
}

function trainSkill(c, sim, key, dt) {
  const sk = c.skills[key]; if (!sk || sk.level >= 10) return;
  sk.xp += dt * skillGain(c) * (c.likes.some((l) => c.session?.tags.includes(l)) ? 1.2 : 1);
  const need = 40 * (sk.level + 1);
  if (sk.xp >= need) { sk.xp -= need; sk.level++; log(c, sim, `${SKILLS[key].name} improved to level ${sk.level}.`, SKILLS[key].icon); }
}

// ---- goals ----------------------------------------------------------------------------------------------------
export function stepProgress(c, sim, st) {
  const k = st.check;
  if (k.skill) return { cur: c.skills[k.skill].level, max: k.level };
  if (k.tag) return { cur: Math.min(k.n, c.stats.tags[k.tag] || 0), max: k.n };
  if (k.aff) return { cur: Math.round(sim.char(c.id).rel[k.aff.with]?.aff ?? 0), max: k.aff.min };
  if (k.flag) return { cur: sim.flags[k.flag] ? 1 : 0, max: 1, flag: true };
  return { cur: 0, max: 1 };
}
function checkGoals(c, sim) {
  for (const g of c.goals) {
    if (g.state !== 'active') continue;
    for (const st of g.steps) {
      if (st.done) continue;
      const p = stepProgress(c, sim, st);
      if (p.cur >= p.max) { st.done = true; log(c, sim, `Goal step done (${g.title}): ${st.text.charAt(0).toLowerCase() + st.text.slice(1)}.`, '🎯'); }
    }
    if (g.steps.every((s) => s.done)) { g.state = 'done'; log(c, sim, `Achieved a life goal: ${g.title}!`, '🏆'); c.boost = 1; }
  }
}

// ---- per-frame ------------------------------------------------------------------------------------------------
export function tick(c, dt, sim) {
  // activity session + skill training + like/dislike feelings
  if (c.mode === 'use' && c.use) {
    if (!c.session) startSession(c);
    c.session.t += dt;
    if (c.session.trains) trainSkill(c, sim, c.session.trains, dt);
    for (const t of c.session.tags) {
      if (c.likes.includes(t)) { c.boost = Math.min(1, c.boost + dt * 0.05); c.needs.fun = Math.min(1, c.needs.fun + dt * 0.02); }
      if (c.dislikes.includes(t)) c.boost = Math.max(-0.5, c.boost - dt * 0.04);
    }
  }
  // company: relationships grow, clashes sour them
  let near = false;
  for (const o of sim.chars) {
    if (o === c) continue;
    const r = c.rel[o.id]; if (!r) continue;
    const d2 = (o.x - c.x) ** 2 + (o.z - c.z) ** 2;
    if (d2 < 6.25) {
      near = true;
      const sharing = c.mode === 'use' && o.mode === 'use' && c.session?.tags.includes('socializing') && o.session?.tags.includes('socializing');
      r.aff = clamp(r.aff + dt * 0.004 * relGain(c) * (sharing ? 3 : 1), -100, 100);
    }
    if (d2 < 25 && o.mode === 'use' && o.session?.tags.some((t) => c.dislikes.includes(t))) {
      r.aff = clamp(r.aff - dt * 0.006, -100, 100); c.boost = Math.max(-0.5, c.boost - dt * 0.015);
    }
  }
  if (near) { c.togetherT += dt; if (c.togetherT > 90) { c.togetherT = 0; fulfil(c, sim, 'together'); } } else c.togetherT = Math.max(0, c.togetherT - dt * 0.2);
  c.boost += (0 - c.boost) * Math.min(1, dt * 0.01);
  // mood from needs + recent joy
  const avg = Object.values(c.needs).reduce((a, b) => a + b, 0) / 5, worst = Math.min(...Object.values(c.needs));
  c.mood = clamp(avg * 0.62 + worst * 0.13 + 0.05 + c.boost * 0.2, 0, 1);
  // wishes refresh
  for (let i = c.wishes.length - 1; i >= 0; i--) if (c.wishes[i].done && sim.time - c.wishes[i].doneAt > 7) c.wishes.splice(i, 1);
  while (c.wishes.length < 3 && sim.time % 1 < dt) { addWish(c, sim); break; }
  c.goalTimer -= dt; if (c.goalTimer <= 0) { c.goalTimer = 1; checkGoals(c, sim); }
}

export const moodLabel = (m) => (m > 0.82 ? 'Delighted' : m > 0.64 ? 'Content' : m > 0.46 ? 'Fine' : m > 0.3 ? 'Uneasy' : 'Miserable');
export const bondLabel = (a) => (a > 85 ? 'Devoted' : a > 65 ? 'Close' : a > 35 ? 'Friendly' : a > 10 ? 'Acquainted' : a > -20 ? 'Distant' : 'Strained');
export function advanceDate(d) { d.day++; if (d.day > 30) { d.day = 1; d.season = (d.season + 1) % 4; if (d.season === 0) d.year++; } }
