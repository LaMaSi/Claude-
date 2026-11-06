// Headless simulation: characters, movement, furniture use. No rendering imports.
import { FURNITURE } from '../data/furniture.js';
import { buildNav } from './nav.js';

const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const ease = (t) => t * t * (3 - 2 * t);
const rand = (a, b) => a + Math.random() * (b - a);
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
    this.hour = 12;
    this.chars = family.map((f) => {
      const p = this.nav.nearestWalkable(f.start.x, f.start.z);
      return {
        id: f.id, name: f.name, role: f.role, age: f.age, scale: f.scale, headScale: f.headScale, look: f.look,
        x: p.x, z: p.z, y: 0, yaw: f.start.yaw, speed: 1.5 * (0.6 + 0.4 * f.scale),
        mode: 'idle', path: [], pending: null, use: null, queued: null, slotKey: null, tween: null,
        pose: { kind: 'stand', anim: 'none' }, activity: '', idleTimer: rand(1, 4), useTimer: 0,
      };
    });
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
      def = FURNITURE[target.def];
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
    c.use = { ...p, exit: p.stand };
    c.pending = null;
    c.pose = { kind: u.pose, anim: u.anim || 'none' };
    c.activity = p.label;
    c.tween = { t: 0, dur: u.pose === 'sleep' ? 0.9 : 0.6, from: { x: c.x, z: c.z, y: c.y, yaw: c.yaw },
      to: { x: w.x, z: w.z, y, yaw: (p.item.rot || 0) + u.face } };
    c.mode = 'enter';
  }

  beginExit(c) {
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

  chooseAuto(c) {
    const night = this.hour >= 21 || this.hour < 6.5;
    const options = [];
    for (const it of this.items) {
      const def = FURNITURE[it.def];
      if (!def.use) continue;
      if (def.use.redirect ? !this.items.some((o) => o.def === def.use.redirect && this.freeSlot(o, c) >= 0) : this.freeSlot(it, c) < 0) continue;
      options.push({ w: it.def === 'bed' ? (night ? 5 : 0.1) : 1, it });
    }
    options.push({ w: 2.5, wander: 'room' }, { w: 0.8, wander: 'garden' });
    let r = Math.random() * options.reduce((s, o) => s + o.w, 0), pick = options[options.length - 1];
    for (const o of options) { r -= o.w; if (r <= 0) { pick = o; break; } }
    if (pick.it) { if (this.commandUse(c, pick.it.index)) return; }
    const { room, bounds } = this.house;
    for (let i = 0; i < 20; i++) {
      const garden = pick.wander === 'garden';
      const x = garden ? rand(bounds.x0, bounds.x1) : rand(room.x0, room.x1), z = garden ? rand(bounds.z0, bounds.z1) : rand(room.z0, room.z1);
      if (this.nav.walkable(x, z) && (garden || (x > room.x0 && x < room.x1))) { this.startMove(c, x, z); return; }
    }
    c.idleTimer = rand(1, 3);
  }

  update(dt) {
    for (const c of this.chars) {
      const selected = c.id === this.selectedId;
      if (c.mode === 'walk') {
        const wp = c.path[0], dx = wp.x - c.x, dz = wp.z - c.z, dist = Math.hypot(dx, dz), step = c.speed * dt;
        if (dist > 0.001) c.yaw += angDiff(c.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 12);
        if (dist <= step) {
          c.x = wp.x; c.z = wp.z; c.path.shift();
          if (!c.path.length) { if (c.pending) this.beginEnter(c); else { c.mode = 'idle'; c.idleTimer = rand(2, 6); } }
        } else { c.x += (dx / dist) * step; c.z += (dz / dist) * step; }
      } else if (c.mode === 'enter') {
        if (this.stepTween(c, dt)) { c.mode = 'use'; c.useTimer = c.pose.kind === 'sleep' ? rand(20, 35) : rand(8, 16); }
      } else if (c.mode === 'use') {
        if (!selected) { c.useTimer -= dt; if (c.useTimer <= 0) this.beginExit(c); }
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
