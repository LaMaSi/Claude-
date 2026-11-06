import { VARIANTS } from './data/variants.js';
import { createImageRenderer, renderCharacter } from './render/portraits.js';

const grid = document.getElementById('grid');
const faceR = createImageRenderer(320, 320), bodyR = createImageRenderer(260, 380);
const cards = [];
function build() {
  grid.innerHTML = '';
  VARIANTS.forEach((v, i) => {
    const cfg = { id: 'v' + i, scale: v.scale, headScale: v.headScale, look: v.look };
    const face = renderCharacter(faceR, cfg, { mode: 'face', turn: 0.3 });
    const body = renderCharacter(bodyR, cfg, { mode: 'body', turn: 0.5 });
    const el = document.createElement('div'); el.className = 'card';
    el.innerHTML = `<div class="pic"></div><h2>${v.name}</h2><div class="role">${v.role}</div><div class="note">${v.note}</div>`;
    grid.append(el); cards.push({ el, face, body });
  });
  show('face');
}
function show(mode) {
  grid.classList.toggle('both', mode === 'both'); grid.classList.toggle('body', mode === 'body');
  for (const c of cards) c.el.querySelector('.pic').innerHTML = (mode !== 'body' ? `<img src="${c.face}" alt="">` : '') + (mode !== 'face' ? `<img src="${c.body}" alt="">` : '');
  for (const b of document.querySelectorAll('#seg button')) b.classList.toggle('on', b.dataset.m === mode);
}
document.getElementById('seg').addEventListener('click', (e) => { const m = e.target.dataset?.m; if (m) show(m); });
if (!faceR) grid.textContent = 'WebGL is not available in this browser.'; else setTimeout(build, 30);
window.__ready = true;
