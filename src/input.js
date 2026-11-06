// Camera rig: fixed angle, pinch/wheel zoom about the touch point, one-finger pan, tap detection.
import * as THREE from 'three';

export function createCameraRig(camera, dom, base, { minZoom = 0.8, maxZoom = 4.5, onTap } = {}) {
  const target = base.clone(), goal = base.clone();
  const offset = camera.position.clone().sub(base);
  const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), tmp = new THREE.Vector3();
  let zoom = 1, goalZoom = null, focusing = false;

  function apply() {
    camera.zoom = zoom; camera.updateProjectionMatrix();
    camera.position.copy(target).add(offset); camera.lookAt(target); camera.updateMatrixWorld();
  }
  function ground(cx, cy) {
    const r = dom.getBoundingClientRect();
    ray.setFromCamera({ x: ((cx - r.left) / r.width) * 2 - 1, y: -((cy - r.top) / r.height) * 2 + 1 }, camera);
    return ray.ray.intersectPlane(plane, tmp) ? tmp.clone() : null;
  }
  function clamp(v) {
    const lim = Math.max(0, (1 - 1 / zoom) * 7.5);
    v.x = THREE.MathUtils.clamp(v.x, base.x - lim, base.x + lim);
    v.z = THREE.MathUtils.clamp(v.z, base.z - lim * 0.9, base.z + lim * 0.9);
  }
  function zoomAt(factor, cx, cy) {
    const before = ground(cx, cy);
    zoom = THREE.MathUtils.clamp(zoom * factor, minZoom, maxZoom); apply();
    const after = ground(cx, cy);
    if (before && after) { target.x += before.x - after.x; target.z += before.z - after.z; }
    clamp(target); apply();
  }
  function panBy(from, to) { // screen points → ground delta
    const a = ground(from.x, from.y), b = ground(to.x, to.y);
    if (!a || !b) return;
    target.x += a.x - b.x; target.z += a.z - b.z; clamp(target); apply();
  }

  const pts = new Map();
  let tapInfo = null, lastDist = 0, lastMid = null;
  const mid = () => { const [a, b] = [...pts.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };

  dom.addEventListener('pointerdown', (e) => {
    dom.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    focusing = false;
    if (pts.size === 1) tapInfo = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
    else { tapInfo = null; lastDist = dist(); lastMid = mid(); }
  });
  dom.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId); if (!p) return;
    const prev = { ...p }; p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 1) {
      if (tapInfo && !tapInfo.moved && Math.hypot(e.clientX - tapInfo.x, e.clientY - tapInfo.y) > 10) tapInfo.moved = true;
      if (tapInfo?.moved) panBy(prev, p);
    } else if (pts.size === 2) {
      const d = dist(), m = mid();
      if (lastDist > 0) zoomAt(d / lastDist, lastMid.x, lastMid.y);
      panBy(lastMid, m);
      lastDist = d; lastMid = m;
    }
  });
  const up = (e) => {
    if (tapInfo && pts.size === 1 && !tapInfo.moved && performance.now() - tapInfo.t < 600 && e.type === 'pointerup') onTap?.(e.clientX, e.clientY);
    pts.delete(e.pointerId); tapInfo = null;
    if (pts.size === 1) lastDist = 0;
  };
  dom.addEventListener('pointerup', up); dom.addEventListener('pointercancel', up);
  dom.addEventListener('wheel', (e) => { e.preventDefault(); focusing = false; zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  apply();
  return {
    camera, ground,
    get zoom() { return zoom; },
    /** Smoothly bring a ground point to the view centre (only meaningful when zoomed in). */
    focus(x, z, minZ = 1.8) { goal.set(x, base.y, z); goalZoom = Math.max(zoom, minZ); focusing = true; },
    update(dt) {
      if (!focusing) return;
      const k = 1 - Math.exp(-dt * 6);
      zoom += (goalZoom - zoom) * k; clamp(goal);
      target.x += (goal.x - target.x) * k; target.z += (goal.z - target.z) * k;
      clamp(target); apply();
    },
    resize() { apply(); },
  };
}
