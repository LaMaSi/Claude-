// Turns simulation state into rig poses. All animation is procedural.
import * as THREE from 'three';
import { buildPerson } from './people.js';

const keys = ['legL', 'legR', 'armL', 'armR', 'armZ', 'lie', 'bob', 'headX'];

export function createCharactersView(scene, sim) {
  const views = new Map();
  for (const c of sim.chars) {
    const p = buildPerson(c);
    p.root.userData.charId = c.id;
    p.cur = Object.fromEntries(keys.map((k) => [k, 0])); p.cur.armZ = -0.12;
    p.phase = Math.random() * 6;
    scene.add(p.root);
    views.set(c.id, p);
  }

  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.54, 40),
    new THREE.MeshBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.95, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; scene.add(ring);

  function targets(c, v, t, dt) {
    const T = { legL: 0, legR: 0, armL: 0, armR: 0, armZ: -0.12, lie: 0, bob: 0, headX: 0 };
    const breathe = Math.sin(t * 2 + v.phase);
    if (c.mode === 'walk') {
      v.phase += dt * c.speed * 5.2;
      const s = Math.sin(v.phase);
      T.legL = s * 0.75; T.legR = -s * 0.75; T.armL = -s * 0.6; T.armR = s * 0.6;
      T.bob = Math.abs(Math.cos(v.phase)) * 0.045;
    } else {
      T.bob = breathe * 0.008; T.armL = breathe * 0.02; T.armR = -breathe * 0.02;
      const kind = c.pose.kind;
      if (kind === 'sit') {
        T.legL = T.legR = -Math.PI / 2 + 0.05; T.armL = T.armR = -0.75;
        if (c.pose.anim === 'rest') { T.armL = -0.95; T.armR = -0.95; }
      } else if (kind === 'sleep') {
        T.lie = 1; T.bob = breathe * 0.012; T.armL = T.armR = 0.05; T.armZ = 0.12;
      } else {
        const a = c.pose.anim, busy = c.mode === 'use' ? 1 : 0;
        if (a === 'forward') { T.armL = -1.15 + Math.sin(t * 7) * 0.2 * busy; T.armR = -1.15 + Math.cos(t * 6) * 0.2 * busy; T.headX = 0.15; }
        if (a === 'raise') { T.armL = -2.5 + Math.sin(t * 6) * 0.35 * busy; T.armR = -2.5 + Math.sin(t * 6 + 2) * 0.35 * busy; T.armZ = 0.35; T.bob = Math.sin(t * 9) * 0.01; }
      }
    }
    return T;
  }

  return {
    views,
    update(dt, t, selectedId) {
      const k = 1 - Math.exp(-dt * 14);
      for (const c of sim.chars) {
        const v = views.get(c.id), T = targets(c, v, t, dt);
        for (const key of keys) v.cur[key] += (T[key] - v.cur[key]) * k;
        const { parts, cur } = v;
        parts.legL.rotation.x = cur.legL; parts.legR.rotation.x = cur.legR;
        parts.armL.rotation.x = cur.armL; parts.armR.rotation.x = cur.armR;
        parts.armL.rotation.z = cur.armZ; parts.armR.rotation.z = -cur.armZ;
        parts.body.position.y = cur.bob; parts.head.rotation.x = cur.headX;
        v.pivot.rotation.x = -Math.PI / 2 * cur.lie;
        if (parts.tail) parts.tail.rotation.y = Math.sin(t * 3 + v.phase) * 0.3; // non-human species hook
        v.root.position.set(c.x, c.y, c.z); v.root.rotation.y = c.yaw;
      }
      const sel = sim.char(selectedId);
      ring.visible = !!sel;
      if (sel) {
        const s = 1 + Math.sin(t * 4) * 0.06, r = 0.55 * (0.55 + 0.45 * sel.scale);
        ring.position.set(sel.x, Math.max(0.03, sel.y > 0.3 ? 0.03 : 0.03), sel.z);
        ring.scale.setScalar(r * s / 0.5);
      }
    },
  };
}
