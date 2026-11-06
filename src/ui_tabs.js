// HTML renderers for the character panel tabs (everything except the live need vials).
import { TRAITS, SKILLS, TAGS } from './data/traits.js';
import { stepProgress, bondLabel, moodLabel } from './sim/life.js';

export const TABS = [
  { id: 'needs', icon: 'gi:cauldron', label: 'Needs' }, { id: 'bonds', icon: '💞', label: 'Bonds' }, { id: 'wishes', icon: '⭐', label: 'Wishes' },
  { id: 'likes', icon: '❤️', label: 'Likes' }, { id: 'skills', icon: '🛡️', label: 'Skills' }, { id: 'work', icon: '🔨', label: 'Work' },
  { id: 'past', icon: '📜', label: 'Past' },
];
const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const hh = (h) => `${String(h).padStart(2, '0')}:00`;
export const moodFace = (m) => (m > 0.82 ? '😄' : m > 0.64 ? '🙂' : m > 0.46 ? '😐' : m > 0.3 ? '😟' : '😢');

const bar = (pct, cls = '') => `<div class="mini ${cls}"><i style="width:${Math.max(0, Math.min(100, pct))}%"></i></div>`;
const chip = (icon, text, cls = '') => `<span class="chip ${cls}"><b>${icon}</b>${esc(text)}</span>`;

function bonds(c, sim, portraits) {
  const rows = Object.entries(c.rel).map(([id, r]) => {
    const o = sim.char(id), img = portraits.get(id), pct = (r.aff + 100) / 2, aff = Math.round(r.aff);
    const near = (o.x - c.x) ** 2 + (o.z - c.z) ** 2 < 6.25;
    return `<div class="row card"><div class="av">${img ? `<img src="${img}" alt="">` : ''}</div>
      <div class="grow"><div class="rt"><b class="nm">${esc(o.name)}</b><span class="dim">${esc(r.label)}</span><span class="right">${near ? '📍 nearby' : ''}</span></div>
      ${bar(pct, aff < 0 ? 'bad' : 'heart')}<div class="rs"><span>${bondLabel(r.aff)}</span><span class="dim">${aff > 0 ? '+' : ''}${aff}</span></div>
      <div class="note">${esc(r.note)}</div></div></div>`;
  });
  return `<h4>Family &amp; Friends</h4>${rows.join('')}<div class="hint">Time spent together, shared meals and company strengthen bonds. Clashing tastes can strain them.</div>`;
}

function wishes(c, sim) {
  const w = c.wishes.map((x) => `<div class="wish ${x.done ? 'done' : ''}"><span class="ck">${x.done ? '✔' : '○'}</span><span>${esc(x.text)}</span></div>`).join('');
  const goals = c.goals.map((g) => {
    const done = g.steps.filter((s) => s.done).length, pct = (done / g.steps.length) * 100;
    const steps = g.steps.map((s) => {
      const p = stepProgress(c, sim, s), prog = !s.done && !p.flag && p.max > 1 ? ` <span class="dim">(${p.cur}/${p.max})</span>` : '';
      const story = !s.done && s.check.flag ? ' <span class="dim">· awaits fate</span>' : '';
      return `<div class="step ${s.done ? 'done' : ''}"><span class="ck">${s.done ? '✔' : '○'}</span><span>${esc(s.text)}${prog}${story}</span></div>`;
    }).join('');
    return `<div class="card goal ${g.state}"><div class="rt"><b class="nm">${g.state === 'done' ? '🏆 ' : '🎯 '}${esc(g.title)}</b></div><div class="note">${esc(g.desc)}</div>${bar(pct, 'gold')}${steps}</div>`;
  }).join('');
  const dream = c.dream ? `<div class="card dream"><b>✨ A dream yet to wake</b><div class="note">${esc(c.dream)}</div></div>` : '';
  return `<h4>Wishes <span class="dim">for now</span></h4>${w}<h4>Life goals</h4>${goals}${dream}`;
}

function likes(c) {
  const ch = (arr, cls) => arr.length ? arr.map((t) => chip(TAGS[t].icon, TAGS[t].label, cls)).join('') : '<span class="dim">Nothing in particular</span>';
  return `<h4>Likes</h4><div class="chips">${ch(c.likes, 'good')}</div><h4>Dislikes</h4><div class="chips">${ch(c.dislikes, 'bad')}</div>
    <div class="hint">Doing something they like lifts ${esc(c.name)}’s mood and keeps them coming back to it. Doing something they dislike sours it, and nearby people may take offence.</div>`;
}

function skills(c) {
  const traits = c.traits.map((t) => `<div class="row"><span class="ico">${TRAITS[t].icon}</span><div class="grow"><b class="nm">${esc(TRAITS[t].name)}</b><div class="note">${esc(TRAITS[t].desc)}</div></div></div>`).join('');
  const known = Object.entries(c.skills).filter(([, s]) => s.level > 0 || s.xp > 0);
  const rows = known.map(([k, s]) => {
    const pips = Array.from({ length: 10 }, (_, i) => `<u class="${i < s.level ? 'on' : ''}"></u>`).join('');
    return `<div class="row"><span class="ico">${SKILLS[k].icon}</span><div class="grow"><div class="rt"><b class="nm">${SKILLS[k].name}</b><span class="right dim">Lv ${s.level}</span></div><div class="pips">${pips}</div>${bar((s.xp / (40 * (s.level + 1))) * 100, 'xp')}</div></div>`;
  }).join('');
  const unk = Object.entries(c.skills).filter(([, s]) => !(s.level > 0 || s.xp > 0)).map(([k]) => SKILLS[k].icon + ' ' + SKILLS[k].name).join(' · ');
  return `<h4>Traits</h4>${traits}<h4>Abilities</h4>${rows}${unk ? `<div class="hint">Untrained: ${unk}</div>` : ''}`;
}

function work(c, sim) {
  const j = c.job;
  if (!j.place) return `<h4>Occupation</h4><div class="card"><b class="nm">${esc(j.title)}</b><div class="note">${esc(j.note)}</div></div><h4>Possible paths</h4><div class="chips">${(j.future || []).map((f) => chip('🧭', f)).join('')}</div><div class="hint">Paths open up through choices, skills and chance meetings.</div>`;
  const on = sim.hour >= j.hours[0] && sim.hour < j.hours[1];
  return `<h4>Occupation</h4><div class="card"><div class="rt"><b class="nm">${esc(j.title)}</b><span class="right ${on ? 'good' : 'dim'}">${on ? 'Work hours' : 'Off duty'}</span></div>
    <div class="kv"><span>📍 Workplace</span><b>${esc(j.place)}</b></div><div class="kv"><span>🕘 Hours</span><b>${hh(j.hours[0])} – ${hh(j.hours[1])}</b></div>
    <div class="kv"><span>🪙 Wage</span><b>${j.wage} coins / day</b></div><div class="chips">${j.skills.map((k) => chip(SKILLS[k].icon, SKILLS[k].name)).join('')}</div>
    <div class="note">${esc(j.note)}</div></div><div class="hint">Working days and wages arrive with the economy update.</div>`;
}

function past(c) {
  const items = c.history.slice().reverse().map((h) => `<div class="ev"><span class="evi">${h.icon}</span><div><div class="evd">${esc(h.date)}</div><div>${esc(h.text)}</div></div></div>`).join('');
  return `<div class="card bio">${esc(c.bio)}</div><h4>Life story</h4><div class="timeline">${items}</div>`;
}

export function renderTab(id, c, sim, portraits) {
  switch (id) {
    case 'bonds': return bonds(c, sim, portraits);
    case 'wishes': return wishes(c, sim);
    case 'likes': return likes(c);
    case 'skills': return skills(c);
    case 'work': return work(c, sim);
    case 'past': return past(c);
    default: return '';
  }
}
export { moodLabel };
