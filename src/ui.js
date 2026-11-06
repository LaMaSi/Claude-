// Bottom-docked UI: portrait row (thumb zone), a tabbed character panel above it, and a small clock top-right.
import { NEEDS } from './data/furniture.js';
import { TABS, renderTab, moodFace } from './ui_tabs.js';
import { moodLabel } from './sim/life.js';
import { dateText } from './sim/life.js';

const ICON = { hunger: '🍖', social: '💬', hygiene: '🧼', fun: '🎲', sleep: '🌙' };
const LABEL = { hunger: 'Hunger', social: 'Social', hygiene: 'Hygiene', fun: 'Fun', sleep: 'Rest' };
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export function createUI({ sim, portraits, onSelect }) {
  const $ = (id) => document.getElementById(id);
  const panel = $('panel'), status = $('status'), ports = new Map(), needEls = new Map(), tabBtns = new Map(), panes = new Map();
  let open = false, tab = 'needs', lastHtml = '';

  // tab buttons + panes
  for (const t of TABS) {
    const b = document.createElement('button'); b.className = 'tab'; b.dataset.tab = t.id;
    b.innerHTML = `<span class="ti">${t.icon}</span><span class="tl">${t.label}</span>`;
    b.addEventListener('click', () => setTab(t.id));
    $('tabs').append(b); tabBtns.set(t.id, b);
  }
  panes.set('needs', $('pane-needs'));
  const dyn = $('pane-dyn'); panes.set('dyn', dyn);

  // needs vials
  for (const n of NEEDS) {
    const el = document.createElement('div'); el.className = 'need';
    el.innerHTML = `<span class="ico">${ICON[n]}</span><div class="bar"><div class="fill"></div></div><span>${LABEL[n]}</span>`;
    $('needs').append(el); needEls.set(n, el);
  }
  // portrait row
  for (const c of sim.chars) {
    const b = document.createElement('button'); b.className = 'port';
    const src = portraits.get(c.id);
    b.innerHTML = `<span class="img">${src ? `<img src="${src}" alt="">` : `<span style="display:block;width:100%;height:100%;background:${hex(c.look.shirt)}"></span>`}</span><span>${c.name}</span><span class="alert"></span>`;
    b.addEventListener('click', () => {
      if (sim.selectedId === c.id) setOpen(!open);
      else { onSelect(c.id); setOpen(true); lastHtml = ''; }
    });
    $('portraits').append(b); ports.set(c.id, b);
  }

  function setOpen(v) { open = v; panel.classList.toggle('closed', !v); status.classList.toggle('hide', v); }
  function setTab(id) {
    tab = id; lastHtml = '';
    for (const [k, b] of tabBtns) b.classList.toggle('on', k === id);
    $('pane-needs').style.display = id === 'needs' ? '' : 'none';
    dyn.style.display = id === 'needs' ? 'none' : '';
    $('pbody').scrollTop = 0;
  }
  setTab('needs');

  $('clock').addEventListener('click', () => $('timepop').classList.toggle('open'));

  let acc = 0;
  function update(dt) {
    acc += dt; if (acc < 0.1) return; acc = 0;
    const sel = sim.char(sim.selectedId);
    for (const [id, el] of ports) {
      const c = sim.char(id);
      el.classList.toggle('sel', id === sim.selectedId);
      el.classList.toggle('warn', NEEDS.some((n) => c.needs[n] < 0.2));
    }
    $('datetxt').textContent = dateText(sim.date);
    if (!sel) { status.textContent = 'Tap a portrait'; return; }
    const act = sel.mode === 'walk' ? 'Walking' : sel.activity || 'Idle';
    status.textContent = `${sel.name} · ${act}`;
    if (!open) return;
    $('pname').textContent = sel.name; $('prole').textContent = `${sel.role} · age ${sel.age}`; $('pact').textContent = act;
    if (tab === 'needs') {
      $('moodface').textContent = moodFace(sel.mood); $('moodtext').textContent = moodLabel(sel.mood);
      $('moodfill').style.width = `${Math.round(sel.mood * 100)}%`;
      for (const n of NEEDS) {
        const v = sel.needs[n], el = needEls.get(n);
        el.querySelector('.fill').style.height = `${Math.round(v * 100)}%`;
        el.classList.toggle('low', v < 0.25); el.classList.toggle('mid', v >= 0.25 && v < 0.5);
      }
    } else {
      const html = renderTab(tab, sel, sim, portraits);
      if (html !== lastHtml) { dyn.innerHTML = html; lastHtml = html; }
    }
  }
  setOpen(false);
  return { update, setOpen, get open() { return open; } };
}
