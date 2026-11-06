// Fine navigation grid (0.25 units). Obstacles are rasterised with a margin equal to the
// character radius, so slightly overlapping furniture never breaks pathfinding.
export class NavGrid {
  constructor({ x0, x1, z0, z1 }, step = 0.25) {
    this.step = step; this.x0 = x0; this.z0 = z0;
    this.nx = Math.ceil((x1 - x0) / step); this.nz = Math.ceil((z1 - z0) / step);
    this.blocked = new Uint8Array(this.nx * this.nz);
  }
  cellX(x) { return Math.floor((x - this.x0) / this.step); }
  cellZ(z) { return Math.floor((z - this.z0) / this.step); }
  inside(ix, iz) { return ix >= 0 && iz >= 0 && ix < this.nx && iz < this.nz; }
  center(ix, iz) { return { x: this.x0 + (ix + 0.5) * this.step, z: this.z0 + (iz + 0.5) * this.step }; }
  walkable(x, z) {
    const ix = this.cellX(x), iz = this.cellZ(z);
    return this.inside(ix, iz) && !this.blocked[iz * this.nx + ix];
  }
  /** obbs: {x,z,rot,hw,hd}; circles: {x,z,r}. Same rotation convention as three.js rotation.y. */
  rasterize(obbs, circles, margin) {
    for (let iz = 0; iz < this.nz; iz++) for (let ix = 0; ix < this.nx; ix++) {
      const { x, z } = this.center(ix, iz);
      let b = false;
      for (const o of obbs) {
        const c = Math.cos(o.rot || 0), s = Math.sin(o.rot || 0), dx = x - o.x, dz = z - o.z;
        const lx = dx * c - dz * s, lz = dx * s + dz * c;
        if (Math.abs(lx) <= o.hw + margin && Math.abs(lz) <= o.hd + margin) { b = true; break; }
      }
      if (!b) for (const k of circles) {
        const rr = k.r + margin;
        if ((x - k.x) ** 2 + (z - k.z) ** 2 <= rr * rr) { b = true; break; }
      }
      this.blocked[iz * this.nx + ix] = b ? 1 : 0;
    }
  }
  nearestWalkable(x, z, maxR = 40) {
    if (this.walkable(x, z)) return { x, z };
    const cx = this.cellX(x), cz = this.cellZ(z);
    let best = null, bestD = Infinity, found = -1;
    for (let r = 1; r <= maxR; r++) {
      if (found >= 0 && r > found + 1) break;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const ix = cx + dx, iz = cz + dz;
        if (!this.inside(ix, iz) || this.blocked[iz * this.nx + ix]) continue;
        const c = this.center(ix, iz), d = (c.x - x) ** 2 + (c.z - z) ** 2;
        if (d < bestD) { bestD = d; best = c; found = found < 0 ? r : found; }
      }
    }
    return best;
  }
  lineClear(a, b) {
    const len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(len / 0.08));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (!this.walkable(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
    }
    return true;
  }
  /** Returns waypoints from `from` (exclusive) to `to`, or null. Snaps blocked endpoints. */
  findPath(from, to) {
    const s = this.nearestWalkable(from.x, from.z), g = this.nearestWalkable(to.x, to.z);
    if (!s || !g) return null;
    if (this.lineClear(from, g) && this.walkable(from.x, from.z)) return [g];
    const { nx, nz } = this;
    const si = this.cellZ(s.z) * nx + this.cellX(s.x), gi = this.cellZ(g.z) * nx + this.cellX(g.x);
    const gScore = new Float32Array(nx * nz).fill(Infinity), came = new Int32Array(nx * nz).fill(-1);
    const closed = new Uint8Array(nx * nz);
    const gx = gi % nx, gz = (gi / nx) | 0;
    const h = (i) => { const dx = Math.abs((i % nx) - gx), dz = Math.abs(((i / nx) | 0) - gz); return Math.max(dx, dz) + 0.4142 * Math.min(dx, dz); };
    const heap = []; // [f, idx] binary min-heap
    const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { let l = 2 * k + 1, r = l + 1, m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    gScore[si] = 0; push(h(si), si);
    const ok = (ix, iz) => this.inside(ix, iz) && !this.blocked[iz * nx + ix];
    while (heap.length) {
      const [, cur] = pop();
      if (closed[cur]) continue;
      closed[cur] = 1;
      if (cur === gi) break;
      const cx = cur % nx, cz = (cur / nx) | 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const ix = cx + dx, iz = cz + dz;
        if (!ok(ix, iz)) continue;
        if (dx && dz && (!ok(cx + dx, cz) || !ok(cx, cz + dz))) continue; // no corner cutting
        const ni = iz * nx + ix, ng = gScore[cur] + (dx && dz ? 1.4142 : 1);
        if (ng < gScore[ni]) { gScore[ni] = ng; came[ni] = cur; push(ng + h(ni), ni); }
      }
    }
    if (came[gi] < 0 && gi !== si) return null;
    const cells = [];
    for (let i = gi; i !== -1; i = came[i]) cells.push(this.center(i % nx, (i / nx) | 0));
    cells.reverse();
    // string-pull: drop waypoints that have a clear straight line
    const pts = [{ x: from.x, z: from.z }, ...cells.slice(1)];
    pts[pts.length - 1] = g;
    const out = []; let a = 0;
    while (a < pts.length - 1) {
      let b = pts.length - 1;
      while (b > a + 1 && !this.lineClear(pts[a], pts[b])) b--;
      out.push(pts[b]); a = b;
    }
    return out;
  }
}

export function buildNav(house, furniture) {
  const nav = new NavGrid(house.bounds);
  const { x0, x1, z0, z1 } = house.room, t = 0.11;
  const obbs = [];
  const rect = (xa, xb, za, zb) => obbs.push({ x: (xa + xb) / 2, z: (za + zb) / 2, rot: 0, hw: (xb - xa) / 2, hd: (zb - za) / 2 });
  rect(x0 - t, x1 + t, z0 - t, z0 + t);   // back wall
  rect(x0 - t, x1 + t, z1 - t, z1 + t);   // front kerb
  rect(x1 - t, x1 + t, z0 - t, z1 + t);   // right kerb
  const doors = house.openings.filter((o) => o.wall === 'left' && o.bottom === 0).sort((a, b) => a.center - b.center);
  let cur = z0 - t;
  for (const d of doors) { rect(x0 - t, x0 + t, cur, d.center - d.width / 2); cur = d.center + d.width / 2; }
  rect(x0 - t, x0 + t, cur, z1 + t);
  for (const it of house.items) {
    const def = furniture[it.def];
    if (def.floorDecor || def.wallMounted) continue;
    obbs.push({ x: it.x, z: it.z, rot: it.rot || 0, hw: def.footprint[0] / 2, hd: def.footprint[1] / 2 });
  }
  nav.rasterize(obbs, house.scenery.filter((s) => s.r > 0), 0.2);
  return nav;
}
