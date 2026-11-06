// Headless simulation: characters, movement, furniture use. No rendering imports.
import { FURNITURE, NEEDS } from '../data/furniture.js';
import { buildNav } from './nav.js';
import { START_DATE } from '../data/family.js';
import { initLife, tick as lifeTick, endSession, preferenceWeight, decayMult, advanceDate } from './life.js';

const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const ease = (t) => t * t * (3 - 2 * t);
const rand = (a, b) => a + Math.random() * (b - a);
// seconds for a full bar to drain to empty / restore rate per second at weight 1
const DECAY_SECONDS = { hunger: 240, social: 300, hygiene: 360, fun: 260, sleep: 420 };
const RESTORE = 0.07;
const sat = (c, def) => Object.entries(def.needs).every(([n, w]) => w < 0.4 || c.needs[n] > 0.86);
export const toWorld = (it, lx, lz) => {
  const c = Math.cos(it.rot || 0), s = Math.sin(it.rot || 0);
  return { x: it.x + lx * c + lz * s, z: it.z - lx * s + lz * c };
};

export class Sim {
  constructor(house, family) {
    this.house = house;
    this.items = house.items.map((it, index) => ({ ...it, index }));
    this.nav = buildNav(house, FURNITURE);
    this.occupied = new Map(); // "item:slot" -> character id
    this.selectedId = null;
    this.hour = 12; this.time = 0; this.flags = {}; this.date = { ...START_DATE };
    this.chars = family.map((f) => {
      const p = this.nav.nearestWalkable(f.start.x, f.start.z);
      return {
        id: f.id, name: f.name, role: f.role, age: f.age, scale: f.scale, headScale: f.headScale, look: f.look,
        x: p.x, z: p.z, y: 0, yaw: f.start.yaw, speed: 1.5 * (0.6 + 0.4 * f.scale),
        mode: 'idle', path: [], pending: null, use: null, queued: null, slotKey: null, tween: null,
        needs: Object.fromEntries(NEEDS.map((n) => [n, rand(0.45, 0.9)])),
        pose: { kind: 'stand', anim: 'none' }, activity: '', idleTimer: rand(1, 4), useTimer: 0,
      };
    });
    this.chars.forEach((c, i) => initLife(c, family[i], this));
  }

  char(id) { return this.chars.find((c) => c.id === id); }

  select(id) {
    const prev = this.char(this.selectedId);
    this.selectedId = id;
    if (prev && prev.id !== id && prev.mode === 'use') prev.useTimer = rand(4, 8);
  }

  // ---- commands --------------------------------------------------------------
  commandMove(c, x, z) {
    this.cancelPending(c);
    if (c.mode === 'use' || c.mode === 'enter' || c.mode === 'exit') {
      c.queued = { type: 'move', x, z };
      if (c.mode !== 'exit') this.beginExit(c);
      return true;
    }
    return this.startMove(c, x, z);
  }

  commandUse(c, itemIndex) {
    const r = this.resolveUse(c, itemIndex);
    if (!r) return false;
    if ((c.mode === 'use' || c.mode === 'enter') && c.use && c.slotKey === `${r.item.index}:${r.slotIdx}`) return true;
    this.cancelPending(c);
    if (c.mode === 'use' || c.mode === 'enter' || c.mode === 'exit') {
      c.queued = { type: 'use', itemIndex };
      if (c.mode !== 'exit') this.beginExit(c);
      return true;
    }
    c.slotKey = `${r.item.index}:${r.slotIdx}`;
    this.occupied.set(c.slotKey, c.id);
    const u = r.def.use;
    const slot = u.slots[r.slotIdx];
    const approach = toWorld(r.item, u.approach[0] + (u.relX ? slot.x : 0), u.approach[1]);
    const stand = this.nav.nearestWalkable(approach.x, approach.z) || approach;
    c.pending = { ...r, stand, label: r.label };
    if (!this.startMove(c, stand.x, stand.z, true)) { this.release(c); c.pending = null; return false; }
    return true;
  }

  // ---- internals -------------------------------------------------------------
  resolveUse(c, itemIndex) {
    const item = this.items[itemIndex];
    let def = FURNITURE[item.def], label = def.use?.activity;
    if (!def.use) return null;
    let target = item;
    if (def.use.redirect) {
      let best = Infinity; target = null;
      for (const it of this.items) {
        if (it.def !== def.use.redirect || this.freeSlot(it, c) < 0) continue;
        const d = (it.x - c.x) ** 2 + (it.z - c.z) ** 2;
        if (d < best) { best = d; target = it; }
      }
      if (!target) return null;
      def = FURNITURE[target.def]; label = def.use.activity;
    }
    const slotIdx = this.freeSlot(target, c);
    if (slotIdx < 0) return null;
    return { item: target, def, slotIdx, label };
  }

  freeSlot(item, c) {
    const slots = FURNITURE[item.def].use?.slots || [];
    for (let i = 0; i < slots.length; i++) {
      const who = this.occupied.get(`${item.index}:${i}`);
      if (!who || who === c.id) return i;
    }
    return -1;
  }

  release(c) { if (c.slotKey) { this.occupied.delete(c.slotKey); c.slotKey = null; } }
  cancelPending(c) { if (c.pending) { this.release(c); c.pending = null; } }

  startMove(c, x, z, keepPending = false) {
    if (!keepPending) c.pending = null;
    const path = this.nav.findPath({ x: c.x, z: c.z }, { x, z });
    c.path = path || [];
    c.mode = c.path.length ? 'walk' : 'idle';
    if (c.mode === 'idle') c.idleTimer = rand(1, 3);
    return !!path;
  }

  beginEnter(c) {
    const p = c.pending, u = p.def.use, slot = u.slots[p.slotIdx];
    let lz = slot.z, y = u.floorY || 0;
    if (u.pose === 'sit') y = u.seatTop - 0.5 * c.scale + 0.02;
    if (u.pose === 'sleep') { lz = -0.62 + 1.2 * c.scale; y = 0.5 + 0.13 * c.scale; }
    const w = toWorld(p.item, slot.x, lz);
    c.use = { ...p, exit: p.stand }; c.lastUse = p.item.def;
    c.pending = null;
    c.pose = { kind: u.pose, anim: u.anim || 'none' };
    c.activity = p.label;
    c.tween = { t: 0, dur: u.pose === 'sleep' ? 0.9 : 0.6, from: { x: c.x, z: c.z, y: c.y, yaw: c.yaw },
      to: { x: w.x, z: w.z, y, yaw: (p.item.rot || 0) + u.face } };
    c.mode = 'enter';
  }

  beginExit(c) {
    endSession(c, this);
    const ex = c.use?.exit || { x: c.x, z: c.z };
    c.tween = { t: 0, dur: 0.5, from: { x: c.x, z: c.z, y: c.y, yaw: c.yaw }, to: { x: ex.x, z: ex.z, y: 0, yaw: c.yaw } };
    c.mode = 'exit';
    c.pose = { kind: 'stand', anim: 'none' };
    c.activity = '';
    this.release(c);
  }

  stepTween(c, dt) {
    const tw = c.tween; tw.t += dt / tw.dur;
    const k = ease(Math.min(1, tw.t));
    c.x = tw.from.x + (tw.to.x - tw.from.x) * k;
    c.z = tw.from.z + (tw.to.z - tw.from.z) * k;
    c.y = tw.from.y + (tw.to.y - tw.from.y) * k;
    c.yaw = tw.from.yaw + angDiff(tw.from.yaw, tw.to.yaw) * k;
    return tw.t >= 1;
  }

  urgency(c, def) { return Object.entries(def.needs).reduce((a, [n, w]) => a + w * (1 - c.needs[n]) ** 2, 0); }

  chooseAuto(c) {
    const night = this.hour >= 21 || this.hour < 6.5;
    const options = [];
    for (const it of this.items) {
      const def = FURNITURE[it.def];
      if (!def.use) continue;
      const tdef = def.use.redirect ? FURNITURE[def.use.redirect] : def;
      if (def.use.redirect ? !this.items.some((o) => o.def === def.use.redirect && this.freeSlot(o, c) >= 0) : this.freeSlot(it, c) < 0) continue;
      let w = (0.03 + this.urgency(c, tdef) * 4) * preferenceWeight(c, tdef.tags);
      if (c.lastUse === (def.use.redirect ? def.use.redirect : it.def)) w *= 0.15; // variety: don't repeat the same thing back to back
      if (it.def === 'bed') w *= night ? 3 : 0.25;
      options.push({ w, it });
    }
    options.push({ w: 0.25, wander: 'room' }, { w: 0.08, wander: 'garden' });
    // desperate: take the single most urgent option outright
    const worst = Math.min(...NEEDS.map((n) => c.needs[n]));
    let pick;
    if (worst < 0.15) pick = options.filter((o) => o.it).sort((a, b) => b.w - a.w)[0];
    if (!pick) {
      let r = Math.random() * options.reduce((s2, o) => s2 + o.w, 0); pick = options[options.length - 1];
      for (const o of options) { r -= o.w; if (r <= 0) { pick = o; break; } }
    }
    if (pick?.it) { if (this.commandUse(c, pick.it.index)) return; }
    const { room, bounds } = this.house;
    const garden = pick?.wander === 'garden';
    for (let i = 0; i < 20; i++) {
      const x = garden ? rand(bounds.x0, bounds.x1) : rand(room.x0, room.x1), z = garden ? rand(bounds.z0, bounds.z1) : rand(room.z0, room.z1);
      if (this.nav.walkable(x, z) && (garden || (x > room.x0 && x < room.x1))) { this.startMove(c, x, z); return; }
    }
    c.idleTimer = rand(1, 3);
  }

  updateNeeds(c, dt) {
    for (const n of NEEDS) c.needs[n] = Math.max(0, c.needs[n] - dt * decayMult(c, n) / DECAY_SECONDS[n]);
    // company: being near another person slowly restores social
    for (const o of this.chars) if (o !== c && (o.x - c.x) ** 2 + (o.z - c.z) ** 2 < 6) { c.needs.social = Math.min(1, c.needs.social + dt * 0.012); break; }
    if (c.mode === 'use' && c.use) {
      for (const [n, w] of Object.entries(FURNITURE[c.use.item.def].needs)) c.needs[n] = Math.min(1, c.needs[n] + dt * RESTORE * w * (n === 'sleep' ? 1.1 : 1));
    }
    lifeTick(c, dt, this);
  }

  setFlag(name, v = true) { this.flags[name] = v; }
  advanceDay() { advanceDate(this.date); }

  update(dt) {
    this.time += dt;
    for (const c of this.chars) {
      this.updateNeeds(c, dt);
      const selected = c.id === this.selectedId;
      if (c.mode === 'walk') {
        const wp = c.path[0], dx = wp.x - c.x, dz = wp.z - c.z, dist = Math.hypot(dx, dz), step = c.speed * dt;
        if (dist > 0.001) c.yaw += angDiff(c.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 12);
        if (dist <= step) {
          c.x = wp.x; c.z = wp.z; c.path.shift();
          if (!c.path.length) { if (c.pending) this.beginEnter(c); else { c.mode = 'idle'; c.idleTimer = rand(2, 6); } }
        } else { c.x += (dx / dist) * step; c.z += (dz / dist) * step; }
      } else if (c.mode === 'enter') {
        if (this.stepTween(c, dt)) { c.mode = 'use'; c.useTimer = c.pose.kind === 'sleep' ? 60 : 30; }
      } else if (c.mode === 'use') {
        if (!selected) { c.useTimer -= dt; if (c.useTimer <= 0 || sat(c, FURNITURE[c.use.item.def])) this.beginExit(c); }
      } else if (c.mode === 'exit') {
        if (this.stepTween(c, dt)) {
          c.mode = 'idle'; c.use = null; c.idleTimer = rand(1, 3);
          const q = c.queued; c.queued = null;
          if (q?.type === 'move') this.startMove(c, q.x, q.z);
          else if (q?.type === 'use') this.commandUse(c, q.itemIndex);
        }
      } else if (c.mode === 'idle' && !selected) {
        c.idleTimer -= dt;
        if (c.idleTimer <= 0) this.chooseAuto(c);
      }
    }
  }
}
