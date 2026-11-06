import './creator.css';
import * as THREE from 'three';
import { STAGES, STAGE_IDS, bodyFor } from '../data/stages.js';
import { TRAITS, TAGS, SKILLS } from '../data/traits.js';
import * as D from '../data/creator.js';
import * as G from './generate.js';
import { buildPerson } from '../render/people.js';
import { createImageRenderer, renderCharacter } from '../render/portraits.js';
import { saveWorld } from '../session.js';

const rng = Math.random;
const $ = (tag, cls = '', html = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TABS = [['who', 'Who'], ['look', 'Look'], ['traits', 'Traits'], ['likes', 'Likes'], ['story', 'Story'], ['bonds', 'Bonds']];
const STAGE_LETTER = { infant: 'I', child: 'C', adult: 'A', senior: 'S' };
const SKILL_CAP = { infant: 0, child: 2, adult: 6, senior: 8 };

const S = { draft: G.randomHousehold(rng), sel: 0, tab: 'who', face: false };
const member = () => S.draft.members[S.sel];
const cfgOf = (m) => { const b = bodyFor(m.stage, m.age, m.heightK); return { id: m.uid, species: 'ray', scale: b.scale, headScale: b.headScale, look: m.look }; };

// ---- skeleton ---------------------------------------------------------------------------------------------------------
const app = document.getElementById('app'), root = $('div'); root.id = 'cr'; app.append(root);
const bar = $('div', 'bar wood'); bar.style.cssText = 'border-radius:0 0 16px 16px;border-top:0';
bar.innerHTML = '<h1>New household</h1>';
const rndAll = $('button', 'btn small', '🎲 Random'); const eastBtn = $('a', 'btn small', 'Eastwood'); eastBtn.href = 'index.html?play=default'; eastBtn.style.textDecoration = 'none';
bar.append(rndAll, eastBtn);
const preview = $('div'); preview.id = 'preview';
const tabsEl = $('div'); tabsEl.id = 'tabs';
const editor = $('div'); editor.id = 'editor';
const checks = $('div'); checks.id = 'checks';
const dock = $('div'); dock.id = 'dock';
const roster = $('div', 'wood'); roster.id = 'roster';
const startRow = $('div'); startRow.id = 'startrow';
dock.append(roster, startRow);
root.append(bar, preview, tabsEl, editor, checks, dock);

// ---- 3D preview ------------------------------------------------------------------------------------------------------
const pv = (() => {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(devicePixelRatio, 2)); r.toneMapping = THREE.ACESFilmicToneMapping; preview.append(r.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x6a6050, 1.5)); const d = new THREE.DirectionalLight(0xffffff, 2.4); d.position.set(-2, 3, 4); scene.add(d);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.06, 32), new THREE.MeshStandardMaterial({ color: 0x3a2a1c, roughness: 0.9 })); disc.position.y = -0.03; scene.add(disc);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 30); cam.position.set(0, 1, 6);
  let person = null, spin = 0.35, auto = true, dragX = null;
  const frame = () => {
    const w = preview.clientWidth || 300, h = preview.clientHeight || 220, a = w / h;
    let top = 1.95, bot = -0.12, cx = 0;
    if (person) { person.root.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(person.root); top = Math.max(1.95, bb.max.y + 0.1); }
    if (S.face && person) { const hp = person.parts.head.getWorldPosition(new THREE.Vector3()), rad = 0.2 * (person.parts.head.scale.x || 1) * (person.root.children[0]?.scale.x || 1); top = hp.y + rad * 2.4; bot = hp.y - rad * 2.0; }
    const hh = (top - bot) / 2, cy = (top + bot) / 2;
    cam.left = -hh * a; cam.right = hh * a; cam.top = hh; cam.bottom = -hh; cam.position.set(cx, cy, 6); cam.lookAt(cx, cy, 0); cam.updateProjectionMatrix();
  };
  const resize = () => { r.setSize(preview.clientWidth, preview.clientHeight); frame(); };
  new ResizeObserver(resize).observe(preview);
  preview.addEventListener('pointerdown', (e) => { dragX = e.clientX; auto = false; preview.setPointerCapture(e.pointerId); });
  preview.addEventListener('pointermove', (e) => { if (dragX == null) return; spin += (e.clientX - dragX) * 0.012; dragX = e.clientX; });
  preview.addEventListener('pointerup', () => { dragX = null; setTimeout(() => { if (dragX == null) auto = true; }, 1800); });
  let last = performance.now();
  (function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; if (auto) spin += dt * 0.55; if (person) person.root.rotation.y = spin; r.render(scene, cam); requestAnimationFrame(loop); })(last);
  return { set(m) { if (person) scene.remove(person.root); person = buildPerson(cfgOf(m)); scene.add(person.root); frame(); }, frame, resize };
})();
const tools = $('div'); tools.id = 'pvtools'; const faceBtn = $('button', 'btn small', '🔍 Face'); tools.append(faceBtn); preview.append(tools);
const pvName = $('div'); pvName.id = 'pvname'; const pvSub = $('div'); pvSub.id = 'pvsub'; preview.append(pvSub, pvName);
faceBtn.addEventListener('click', () => { S.face = !S.face; faceBtn.textContent = S.face ? '🧍 Body' : '🔍 Face'; pv.frame(); });

// ---- portraits (roster) -----------------------------------------------------------------------------------------------
const imgR = createImageRenderer(128, 128), portraits = new Map();
const portraitTimers = new Map();
function refreshPortrait(m, now = false) {
  clearTimeout(portraitTimers.get(m.uid));
  const go = () => { if (imgR) { portraits.set(m.uid, renderCharacter(imgR, cfgOf(m), { mode: 'face' })); renderRoster(); } };
  now ? go() : portraitTimers.set(m.uid, setTimeout(go, 350));
}

// ---- change plumbing ----------------------------------------------------------------------------------------------------
function changed({ look = false, relayout = true, rebio = false } = {}) {
  const m = member();
  if (look) { pv.set(m); refreshPortrait(m); }
  if (relayout) renderEditor();
  renderHeader(); renderChecks(); renderRoster();
}
const keepScroll = (fn) => { const y = editor.scrollTop; fn(); editor.scrollTop = y; };

// ---- editor widgets ----------------------------------------------------------------------------------------------------
function field(title, key, content, { dice = true, lock = true, onDice } = {}) {
  const m = member(), f = $('div', 'fld'), h = $('div', 'fh'); h.append($('span', 'fl', esc(title)));
  if (dice) { const b = $('button', 'ib', '🎲'); b.title = 'Randomise'; b.addEventListener('click', () => { (onDice || (() => G.rerollField(rng, m, key, S.draft.members)))(); changed({ look: true }); }); h.append(b); }
  if (lock) { const b = $('button', 'ib' + (m.locks[key] ? ' on' : ''), m.locks[key] ? '🔒' : '🔓'); b.title = 'Keep this when randomising'; b.addEventListener('click', () => { m.locks[key] = !m.locks[key]; renderEditor(); }); h.append(b); }
  f.append(h, content); return f;
}
function chips(options, cur, pick, { multi = false, max = 99, labelFn = D.label, cls = '', disabled = () => false } = {}) {
  const w = $('div', 'chips');
  for (const o of options) {
    const on = multi ? cur.includes(o) : cur === o, b = $('button', `pill ${cls}${on ? ' on' : ''}`, esc(labelFn(o)));
    if (disabled(o) || (multi && !on && cur.length >= max)) b.disabled = true;
    b.addEventListener('click', () => pick(o)); w.append(b);
  }
  return w;
}
function swatches(list, cur, pick) {
  const w = $('div', 'sw'); for (const [name, c] of list) { const b = $('button', cur === c ? 'on' : ''); b.style.background = hex(c); b.title = name; b.addEventListener('click', () => pick(c)); w.append(b); } return w;
}
function stepper(v, min, max, step, onChange, fmt = (x) => x) {
  const w = $('div', 'stp'), minus = $('button', '', '−'), plus = $('button', '', '+'), val = $('b', '', esc(fmt(v)));
  minus.disabled = v <= min; plus.disabled = v >= max;
  minus.addEventListener('click', () => onChange(Math.max(min, +(v - step).toFixed(3)))); plus.addEventListener('click', () => onChange(Math.min(max, +(v + step).toFixed(3))));
  w.append(minus, val, plus); return w;
}

// ---- tabs ------------------------------------------------------------------------------------------------------------------
const L = () => member().look;
const setLook = (patch) => { Object.assign(L(), patch); changed({ look: true }); };

function tabWho(m) {
  const out = [], name = $('input', 'txt'); name.value = m.name; name.maxLength = 18; name.placeholder = 'Name';
  name.addEventListener('input', () => { m.name = name.value; renderHeader(); renderChecks(); renderRoster(); });
  out.push(field('Name', 'name', name, { onDice: () => G.rerollField(rng, m, 'name', S.draft.members) }));
  const st = chips(STAGE_IDS, m.stage, (s) => { if (s !== m.stage) { G.setStage(rng, m, s); G.resetRelations(S.draft); changed({ look: true }); } }, { labelFn: (s) => STAGES[s].label });
  const stw = $('div'); stw.append(st, $('div', 'note', `<b>${STAGES[m.stage].label}:</b> ${esc(STAGES[m.stage].blurb)}`));
  out.push(field('Life stage', 'stage', stw, { dice: false, lock: false }));
  const [a0, a1] = STAGES[m.stage].ages;
  out.push(field(`Age (${a0}–${a1})`, 'age', stepper(m.age, a0, a1, 1, (v) => { m.age = v; changed({ look: true }); }, (v) => `${v} yrs`)));
  if (m.stage === 'adult' || m.stage === 'senior') out.push(field('Height', 'build', stepper(m.heightK, 0, 1, 0.1, (v) => { m.heightK = v; changed({ look: true }); }, (v) => (v < 0.34 ? 'Short' : v > 0.66 ? 'Tall' : 'Average'))));
  out.push(field('Build', 'build', stepper(m.look.build, 0.85, 1.3, 0.05, (v) => setLook({ build: v }), (v) => (v < 0.97 ? 'Slim' : v > 1.14 ? 'Sturdy' : 'Medium')), { dice: false }));
  const act = $('div', 'actions'), dup = $('button', 'btn small', '⧉ Duplicate'), rm = $('button', 'btn small danger', '🗑 Remove');
  dup.disabled = S.draft.members.length >= G.MAX_MEMBERS; rm.disabled = S.draft.members.length <= 1;
  dup.addEventListener('click', () => { const c = JSON.parse(JSON.stringify(m)); c.uid = G.newUid(); c.name = G.randomName(rng, S.draft.members.map((x) => x.name)); c.locks = {}; S.draft.members.splice(S.sel + 1, 0, c); S.sel++; G.resetRelations(S.draft); fullRefresh(); });
  rm.addEventListener('click', () => { S.draft.members.splice(S.sel, 1); S.sel = Math.max(0, S.sel - 1); G.resetRelations(S.draft); fullRefresh(); });
  act.append(dup, rm);
  const rnd = $('button', 'btn small', '🎲 Randomise everything unlocked'); rnd.addEventListener('click', () => { G.randomizeMember(rng, m, S.draft.members); G.resetRelations(S.draft); changed({ look: true }); });
  act.append(rnd); out.push(act);
  return out;
}

function tabLook(m) {
  const st = m.stage, o = (f) => D.optionsFor(st, f), l = m.look, out = [];
  out.push(field('Skin', 'skin', swatches(D.SKINS, l.skin, (c) => setLook({ skin: c }))));
  out.push(field('Face shape', 'jaw', chips(o('jaw'), l.jaw, (v) => setLook({ jaw: v }))));
  out.push(field('Eyes', 'eyes', chips(o('eyes'), l.eyes, (v) => setLook({ eyes: v }))));
  out.push(field('Eye colour', 'eyeColor', swatches(D.EYE_COLORS, l.eyeColor, (c) => setLook({ eyeColor: c }))));
  out.push(field('Brows', 'brows', chips(o('brows'), l.brows, (v) => setLook({ brows: v }))));
  out.push(field('Nose', 'nose', chips(o('nose'), l.nose, (v) => setLook({ nose: v }))));
  out.push(field('Mouth', 'mouth', chips(o('mouth'), l.mouth, (v) => setLook({ mouth: v }))));
  out.push(field('Ears', 'ears', chips(o('ears'), l.ears, (v) => setLook({ ears: v }))));
  out.push(field('Freckles', 'freckles', stepper(l.freckles, 0, 12, 2, (v) => setLook({ freckles: v }), (v) => (v ? v : 'None'))));
  out.push(field('Hair style', 'hairStyle', chips(o('hairStyle'), l.hairStyle, (v) => setLook({ hairStyle: v }))));
  out.push(field('Hair colour', 'hair', swatches(D.HAIR_COLORS, l.hair, (c) => setLook({ hair: c }))));
  if (st === 'adult' || st === 'senior') out.push(field('Facial hair', 'facial', chips(o('facial'), l.facial, (v) => setLook({ facial: v }))));
  const hw = $('div'); hw.append(chips(o('headwear'), l.headwear, (v) => setLook({ headwear: v })));
  if (l.headwear && l.headwear !== 'helm') { const sw = swatches(D.CLOTH_COLORS, l.headwearColor, (c) => setLook({ headwearColor: c })); sw.style.marginTop = '8px'; hw.append(sw); }
  out.push(field('Headwear', 'headwear', hw));
  out.push(field('Outfit', 'outfit', chips(o('outfit'), l.outfit, (v) => setLook({ outfit: v }))));
  const cw = $('div'); cw.append(swatches(D.CLOTH_COLORS, l.shirt, (c) => setLook({ shirt: c })));
  const tl = $('div', 'note', 'Trim'); cw.append(tl, swatches([['Gold', 0xe0b24a], ['Red', 0xb8433f], ['Blue', 0x4a6a9a], ['Green', 0x4a7a5a], ['Cream', 0xf0e8d4]], l.trim, (c) => setLook({ trim: c })));
  out.push(field('Clothing colour', 'shirt', cw));
  if (o('accessories').length) out.push(field('Extras', 'accessories', chips(o('accessories'), l.accessories, (v) => setLook({ accessories: l.accessories.includes(v) ? l.accessories.filter((x) => x !== v) : [...l.accessories, v] }), { multi: true })));
  return out;
}

function tabTraits(m) {
  const w = $('div'); w.append($('div', 'note', `Choose up to <b>${G.MAX_TRAITS}</b> (${m.traits.length}/${G.MAX_TRAITS}). Contradicting traits can’t be combined. More are earned through life events.`));
  for (const [id, t] of Object.entries(TRAITS)) {
    const on = m.traits.includes(id), conflict = !on && G.conflictWith(m.traits, id), full = !on && m.traits.length >= G.MAX_TRAITS, cap = m.stage === 'infant' && !on && m.traits.length >= 1;
    const c = $('button', 'card' + (on ? ' on' : ''), `<div class="ct"><span class="ic">${t.icon}</span>${esc(t.name)}</div><div class="cd">${esc(t.desc)}</div>${conflict ? `<div class="cx">Conflicts with ${esc(TRAITS[conflict].name)}</div>` : full ? '<div class="cx">Trait limit reached</div>' : cap ? '<div class="cx">Infants show one trait so far</div>' : ''}`);
    c.disabled = !!(conflict || full || cap);
    c.addEventListener('click', () => { m.traits = on ? m.traits.filter((x) => x !== id) : [...m.traits, id]; changed({}); });
    w.append(c);
  }
  return [field('Personality', 'traits', w)];
}

function tabLikes(m) {
  const inf = m.stage === 'infant', tags = Object.keys(TAGS), out = [];
  const lab = (t) => `${TAGS[t].icon} ${TAGS[t].label}`;
  out.push(field(`Likes (up to ${inf ? 1 : G.MAX_LIKES})`, 'likes', chips(tags, m.likes, (t) => { m.likes = m.likes.includes(t) ? m.likes.filter((x) => x !== t) : [...m.likes, t]; m.dislikes = m.dislikes.filter((x) => x !== t); changed({}); }, { multi: true, max: inf ? 1 : G.MAX_LIKES, labelFn: lab, cls: 'good' }), { onDice: () => Object.assign(m, G.randomLikes(rng, m.stage, m.traits)) }));
  if (!inf) out.push(field(`Dislikes (up to ${G.MAX_DISLIKES})`, 'dislikes', chips(tags, m.dislikes, (t) => { m.dislikes = m.dislikes.includes(t) ? m.dislikes.filter((x) => x !== t) : [...m.dislikes, t]; m.likes = m.likes.filter((x) => x !== t); changed({}); }, { multi: true, max: G.MAX_DISLIKES, labelFn: lab, cls: 'bad' }), { onDice: () => Object.assign(m, G.randomLikes(rng, m.stage, m.traits)) }));
  if (inf) { out.push($('div', 'note', 'An infant has barely any tastes yet. Preferences grow with age.')); return out; }
  const cap = SKILL_CAP[m.stage], sw = $('div');
  sw.append($('div', 'note', `Up to ${G.MAX_SKILLS} starting skills. ${m.stage === 'child' ? 'Children start untrained.' : ''}`));
  const picked = Object.keys(m.skills);
  sw.append(chips(Object.keys(SKILLS), picked, (k) => { if (picked.includes(k)) delete m.skills[k]; else m.skills[k] = Math.min(cap, m.stage === 'senior' ? 5 : m.stage === 'child' ? 1 : 3); changed({}); }, { multi: true, max: G.MAX_SKILLS, labelFn: (k) => `${SKILLS[k].icon} ${SKILLS[k].name}` }));
  for (const k of picked) { const r = $('div', 'skill'); r.append($('span', 'sn', `${SKILLS[k].icon} ${SKILLS[k].name}`), stepper(m.skills[k], 0, cap, 1, (v) => { m.skills[k] = v; changed({}); }, (v) => `Lv ${v}`)); sw.append(r); }
  out.push(field('Starting skills', 'skills', sw));
  return out;
}

function tabStory(m) {
  const out = [], ta = $('textarea', 'txt'); ta.value = m.bio; ta.maxLength = 360; ta.placeholder = 'A few lines about who they are…';
  ta.addEventListener('input', () => { m.bio = ta.value; });
  out.push(field('Backstory', 'bio', ta, { onDice: () => { m.bio = G.randomBio(rng, m); } }));
  if (m.stage === 'infant') { out.push($('div', 'note', 'Infants have no life goal yet. One grows with them.')); return out; }
  const gw = $('div'), other = S.draft.members.find((x) => x !== m && x.stage !== 'infant');
  for (const g of G.goalChoices(m, S.draft.members)) {
    const on = m.goalId === g.id, b = $('button', 'card' + (on ? ' on' : ''), `<div class="ct">🎯 ${esc(g.title.replace('{other}', other?.name ?? 'someone'))}</div><div class="cd">${esc(g.desc.replace('{n}', m.name || 'They').replace('{other}', other?.name ?? 'someone'))}</div>`);
    b.addEventListener('click', () => { m.goalId = g.id; changed({}); }); gw.append(b);
  }
  out.push(field('Life goal', 'goal', gw));
  const dm = $('div'); dm.append(chips(['yes', 'no'], m.dream ? 'yes' : 'no', (v) => { m.dream = v === 'yes' ? (m.dream || D.DREAMS[0]) : null; changed({}); }, { labelFn: (v) => (v === 'yes' ? '✨ Has one' : 'None') }), $('div', 'note', 'A hidden dream is revealed later by events; its words stay secret for now.'));
  out.push(field('Hidden dream', 'dream', dm));
  return out;
}

function tabBonds() {
  const d = S.draft, ms = d.members, out = [];
  if (ms.length < 2) return [$('div', 'note', 'Add more people to set how they are related.')];
  out.push($('div', 'note', 'How is everyone related? Suggested from ages; change any pair.'));
  const reset = $('button', 'btn small', '↺ Reset to suggested'); reset.addEventListener('click', () => { G.resetRelations(d); changed({ relayout: true }); }); const ra = $('div', 'actions'); ra.append(reset); out.push(ra);
  for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) {
    const a = ms[i], b = ms[j], r = $('div', 'rel'), sel = $('select');
    r.append($('div', 'rn', `${esc(a.name || '?')} ↔ ${esc(b.name || '?')}`));
    for (const [code, R] of Object.entries(D.RELATIONS)) { const op = $('option'); op.value = code; op.textContent = R.name.replace('{a}', a.name || 'A').replace('{b}', b.name || 'B'); if (d.rels[G.relKey(a, b)] === code) op.selected = true; sel.append(op); }
    sel.addEventListener('change', () => { d.rels[G.relKey(a, b)] = sel.value; });
    r.append(sel); out.push(r);
  }
  return out;
}

// ---- rendering ---------------------------------------------------------------------------------------------------------
function renderTabs() {
  tabsEl.innerHTML = ''; for (const [id, name] of TABS) { const b = $('button', 'tab' + (S.tab === id ? ' on' : ''), name); b.addEventListener('click', () => { S.tab = id; renderTabs(); renderEditor(); editor.scrollTop = 0; }); tabsEl.append(b); }
}
function renderEditor() {
  keepScroll(() => {
    editor.innerHTML = ''; const m = member(); if (!m) return;
    const nodes = { who: tabWho, look: tabLook, traits: tabTraits, likes: tabLikes, story: tabStory, bonds: tabBonds }[S.tab](m);
    for (const n of nodes) editor.append(n);
  });
}
function renderHeader() {
  const m = member(); if (!m) return;
  pvName.textContent = m.name || 'Unnamed'; pvSub.textContent = `${STAGES[m.stage].label} · age ${m.age}`;
}
function renderChecks() {
  const v = G.validate(S.draft); checks.innerHTML = '';
  for (const e of v.errors) checks.append($('div', 'ck err', `<span>✖</span><span>${esc(e)}</span>`));
  for (const w of v.warnings) checks.append($('div', 'ck warn', `<span>⚠</span><span>${esc(w)}</span>`));
  if (v.ok && !v.warnings.length) checks.append($('div', 'ck ok', '<span>✔</span><span>Ready to start.</span>'));
  startBtn.disabled = !v.ok; return v;
}
function renderRoster() {
  roster.innerHTML = '';
  S.draft.members.forEach((m, i) => {
    const b = $('button', 'rp' + (i === S.sel ? ' sel' : ''), `<span class="im">${portraits.get(m.uid) ? `<img src="${portraits.get(m.uid)}" alt="">` : ''}</span><span>${esc((m.name || '?').slice(0, 8))}</span><span class="st">${STAGE_LETTER[m.stage]}</span>`);
    b.addEventListener('click', () => { S.sel = i; fullRefresh(false); }); roster.append(b);
  });
  if (S.draft.members.length < G.MAX_MEMBERS) { const a = $('button', 'rp add', '<span class="im">+</span><span>Add</span>'); a.addEventListener('click', openAdd); roster.append(a); }
}
function fullRefresh(portraitsToo = true) {
  const m = member(); pv.set(m); renderHeader(); renderTabs(); renderEditor(); renderChecks(); renderRoster();
  if (portraitsToo) for (const x of S.draft.members) if (!portraits.has(x.uid)) refreshPortrait(x, true);
}

// ---- sheets ------------------------------------------------------------------------------------------------------------------
function sheet(build) { const sc = $('div', 'scrim'), sh = $('div', 'sheet wood'); sc.append(sh); sc.addEventListener('click', (e) => { if (e.target === sc) sc.remove(); }); build(sh, () => sc.remove()); document.body.append(sc); }
function openAdd() {
  sheet((sh, close) => {
    sh.append($('h2', '', 'Add someone')); const w = $('div', 'chips');
    for (const s of STAGE_IDS) { const infants = S.draft.members.filter((m) => m.stage === 'infant').length; const b = $('button', 'pill', `${STAGES[s].label}`); b.disabled = s === 'infant' && infants >= G.MAX_INFANTS;
      b.addEventListener('click', () => { const m = G.randomMember(rng, s, S.draft.members); S.draft.members.push(m); S.sel = S.draft.members.length - 1; G.resetRelations(S.draft); close(); fullRefresh(); }); w.append(b); }
    sh.append(w, $('div', 'note', 'A random person of that stage is added. Edit anything afterwards.'));
  });
}
const startBtn = $('button', 'btn primary', 'Start ▶'); startBtn.style.cssText = 'flex:1;justify-content:center;font-size:16px;padding:9px';
startRow.append(startBtn);
startBtn.addEventListener('click', () => {
  const v = G.validate(S.draft); if (!v.ok) return;
  sheet((sh, close) => {
    sh.append($('h2', '', 'New world'));
    const nm = $('input', 'txt'); nm.value = `${S.draft.members[0].name}’s Hearth`; nm.maxLength = 28; sh.append(nm);
    const dw = $('div', 'opt'), diffs = { cozy: ['Cozy', 'You can reload. Hunger and danger are gentler.'], standard: ['Standard', 'Balanced survival.'], hardcore: ['Hardcore', 'Autosave only, no undo. When everyone dies, the world ends.'] };
    let diff = 'standard'; const note = $('div', 'note'), draw = () => { dw.innerHTML = ''; const c = $('div', 'chips'); for (const [k, [n]] of Object.entries(diffs)) { const b = $('button', 'pill' + (diff === k ? ' on' : ''), n); b.addEventListener('click', () => { diff = k; draw(); }); c.append(b); } dw.append(c); note.innerHTML = `<b>${diffs[diff][0]}:</b> ${diffs[diff][1]} <i>Difficulty is saved with the world; its effects arrive with the survival update.</i>`; }; draw();
    sh.append(dw, note);
    const go = $('button', 'btn primary', 'Begin ▶'); go.style.cssText = 'width:100%;justify-content:center;margin-top:16px;font-size:17px;padding:12px';
    go.addEventListener('click', () => { const household = G.finalize(S.draft, rng); saveWorld({ name: nm.value.trim() || 'New world', difficulty: diff, household }); location.href = 'index.html'; });
    sh.append(go);
  });
});
rndAll.addEventListener('click', () => { S.draft = G.randomHousehold(rng); S.sel = 0; portraits.clear(); fullRefresh(); });

// debug/testing hooks
window.__creator = { S, G, fullRefresh, changed };
window.__ready = true;
fullRefresh();
