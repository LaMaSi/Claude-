// Bottom-docked UI: portrait row (thumb zone), a context panel above it (needs now; furniture/build later),
// and a small clock in the top corner.
import { NEEDS } from './data/furniture.js';

const ICON = { hunger: '🍖', social: '💬', hygiene: '🧼', fun: '🎲', sleep: '🌙' };
const LABEL = { hunger: 'Hunger', social: 'Social', hygiene: 'Hygiene', fun: 'Fun', sleep: 'Rest' };
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

export function createUI({ sim, portraits, onSelect }) {
  const $ = (id) => document.getElementById(id);
  const panel = $('panel'), status = $('status'), ports = new Map(), needEls = new Map();
  let open = false;

  // needs grid
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
      else { onSelect(c.id); setOpen(true); }
    });
    $('portraits').append(b); ports.set(c.id, b);
  }

  function setOpen(v) { open = v; panel.classList.toggle('closed', !v); status.classList.toggle('hide', v); }

  // clock popover
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
    if (!sel) { status.textContent = 'Tap a portrait'; return; }
    const act = sel.mode === 'walk' ? 'Walking' : sel.activity || 'Idle';
    status.textContent = `${sel.name} · ${act}`;
    if (!open) return;
    $('pname').textContent = sel.name; $('prole').textContent = `${sel.role} · age ${sel.age}`; $('pact').textContent = act;
    for (const n of NEEDS) {
      const v = sel.needs[n], el = needEls.get(n);
      el.querySelector('.fill').style.height = `${Math.round(v * 100)}%`;
      el.classList.toggle('low', v < 0.25); el.classList.toggle('mid', v >= 0.25 && v < 0.5);
    }
  }
  setOpen(false);
  return { update, setOpen, get open() { return open; } };
}
