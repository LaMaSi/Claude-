// Life stages (pure data). The creator and the simulation both read these.
//   ages    inclusive age range in years      speed   walking speed multiplier (0 = cannot move)
//   decay   extra multipliers on need drain   fixed   cannot act: lies in a crib until cared for / grown
//   scale   body height range across the stage; headScale: bigger heads on young bodies
export const STAGES = {
  infant: { label: 'Infant', ages: [0, 2], scale: [0.36, 0.44], headScale: [1.55, 1.45], speed: 0, fixed: true, canWork: false,
    decay: { hunger: 1.4, sleep: 1.2, hygiene: 1.5, social: 1.3 },
    blurb: 'Cannot move alone. Lies in a crib and depends completely on others.' },
  child: { label: 'Child', ages: [3, 15], scale: [0.56, 0.92], headScale: [1.32, 1.05], speed: 0.85, fixed: false, canWork: false,
    decay: { fun: 1.1 },
    blurb: 'Smaller and slower. Cannot hold a job, but plays, learns and does simple chores.' },
  adult: { label: 'Adult', ages: [16, 54], scale: [0.9, 1.08], headScale: [1.0, 1.0], speed: 1, fixed: false, canWork: true, decay: {},
    blurb: 'Can do everything.' },
  senior: { label: 'Senior', ages: [55, 85], scale: [0.92, 0.98], headScale: [1.0, 1.0], speed: 0.72, fixed: false, canWork: true,
    decay: { sleep: 1.7, hunger: 0.9 },
    blurb: 'Wise and experienced, but tires quickly and moves slowly. Life is drawing to a close.' },
};
export const STAGE_IDS = Object.keys(STAGES);
export const stageForAge = (age) => STAGE_IDS.find((s) => age >= STAGES[s].ages[0] && age <= STAGES[s].ages[1]) ?? 'senior';
const lerp = (a, b, t) => a + (b - a) * t;
/** Body proportions for a given stage and age; `heightK` (0..1) varies height within the stage. */
export function bodyFor(stage, age, heightK = 0.5) {
  const S = STAGES[stage], [a0, a1] = S.ages, t = Math.max(0, Math.min(1, (age - a0) / Math.max(1, a1 - a0)));
  if (stage === 'child' || stage === 'infant') return { scale: lerp(S.scale[0], S.scale[1], t), headScale: lerp(S.headScale[0], S.headScale[1], t) };
  return { scale: lerp(S.scale[0], S.scale[1], heightK), headScale: S.headScale[0] };
}
