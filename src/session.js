// The current world (a save slot): which household lives in which home. One slot for now: 'll.world' in localStorage.
// Later: several slots, a world list and a main menu. The shape is already per-world: { v, name, difficulty, created, household[] }.
import { FAMILY } from './data/family.js';
import { planHome } from './creator/generate.js';

const KEY = 'll.world';
const store = { get: () => { try { return localStorage.getItem(KEY); } catch { return null; } }, set: (v) => { try { localStorage.setItem(KEY, v); } catch { /* private mode */ } }, del: () => { try { localStorage.removeItem(KEY); } catch { /* private mode */ } } };

export function loadWorld() {
  try { const w = JSON.parse(store.get()); if (w && w.v === 1 && Array.isArray(w.household) && w.household.length) return w; } catch { /* corrupt save */ }
  return null;
}
export function saveWorld(w) { store.set(JSON.stringify({ v: 1, created: Date.now(), ...w })); }
export function clearWorld() { store.del(); }

/** The household and home to play: the saved world, or the default Eastwood family (?play=default). */
export function currentSession(params = new URLSearchParams(location.search)) {
  const w = params.get('play') === 'default' ? null : loadWorld();
  const household = w ? w.household : FAMILY;
  return { world: w, household, house: planHome(household).house };
}
