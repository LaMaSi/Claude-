// Characters are plain data. `species` selects the body builder (only 'human' for now).
// Personality: traits (see traits.js), likes/dislikes (activity tags), skills (start levels), relations, goals, job, history.
// Goal step checks: {skill, level} | {tag, n} (activity count) | {flag} (story flag set by events) | {aff:{with,min}}.
export const START_DATE = { year: 1216, season: 2, day: 12 }; // Autumn 1216

export const FAMILY = [
  { id: 'sam', name: 'Sam', role: 'Father', species: 'human', age: 38, scale: 1.0, headScale: 1.0,
    look: { skin: 0xe6b08a, hair: 0x5b3a29, hairStyle: 'short', facial: 'full', outfit: 'tunic', shirt: 0x4f7a9c, pants: 0x6b5a48,
      eyes: 'dot', brows: 'thick', nose: 'big', mouth: 'flat', jaw: 'square', headW: 1.05, build: 1.1 },
    start: { x: 0.4, z: 0.7, yaw: -0.6 },
    bio: 'A man of few words and steady hands. He has lived his whole life in the Eastwood and never seen a town bigger than the market village.',
    traits: ['hardworking', 'quiet', 'practical'], likes: ['resting', 'cooking'], dislikes: ['music'],
    skills: { woodcraft: 5, cooking: 1, fighting: 1 },
    relations: [
      { with: 'maya', label: 'Wife', aff: 82, note: 'Trusts her judgement completely.' },
      { with: 'robin', label: 'Son', aff: 88, note: 'Wants a better life for Robin.' }],
    goals: [{ id: 'warm-home', title: 'A warm, full home', desc: 'Keep the family fed and the hearth burning through the winter.',
      steps: [{ text: 'Cook a stew for the family', check: { tag: 'cooking', n: 4 } }, { text: 'Share eight meals at the table', check: { tag: 'eating', n: 8 } }, { text: 'Grow close to Robin', check: { aff: { with: 'robin', min: 92 } } }] }],
    dream: 'Something beyond the forest is stirring in him, though he does not know it yet.',
    job: { title: 'Woodcutter', place: 'The Eastwood edge', hours: [7, 17], wage: 6, skills: ['woodcraft'], note: 'Fells and hauls timber for the village mill. Quiet work among the trees.' },
    history: [
      { date: 'Autumn 1178', icon: '🍼', text: 'Born in the Eastwood to a woodcutter’s family.' },
      { date: 'Spring 1196', icon: '🪓', text: 'Took up the axe beside his father.' },
      { date: 'Summer 1203', icon: '💍', text: 'Married Maya at the village green.' },
      { date: 'Summer 1209', icon: '👶', text: 'His son Robin was born.' }] },

  { id: 'maya', name: 'Maya', role: 'Mother', species: 'human', age: 36, scale: 0.95, headScale: 1.0,
    look: { skin: 0xc68a65, hair: 0x2e2a33, hairStyle: 'braid', outfit: 'gown', shirt: 0x9a4a6a, headwear: 'coif', headwearColor: 0xf0e8d4,
      eyes: 'wide', eyeColor: 0x3a2a1c, brows: 'arched', nose: 'button', mouth: 'smile', jaw: 'pointy', headW: 0.97, accessories: ['earring'] },
    start: { x: 1.0, z: -1.8, yaw: 2.4 },
    bio: 'Sharp-eyed and endlessly curious. She learned herb-lore from her grandmother and keeps a book of remedies she has never let anyone else read.',
    traits: ['curious', 'kind', 'tidy'], likes: ['gardening', 'reading', 'socializing'], dislikes: ['music'],
    skills: { herbalism: 4, cooking: 3, lore: 2 },
    relations: [
      { with: 'sam', label: 'Husband', aff: 82, note: 'Wishes he would talk more.' },
      { with: 'robin', label: 'Son', aff: 90, note: 'Worries about those wild ideas.' }],
    goals: [{ id: 'herb-wife', title: 'Master of remedies', desc: 'Become the finest herb-wife in the valley.',
      steps: [{ text: 'Tend the herbs often', check: { tag: 'gardening', n: 4 } }, { text: 'Reach Herbalism level 5', check: { skill: 'herbalism', level: 5 } }, { text: 'Study the old books', check: { skill: 'lore', level: 4 } }] }],
    dream: 'There is a loss she has never quite made peace with.',
    job: { title: 'Herb-wife', place: 'The cottage garden', hours: [8, 16], wage: 4, skills: ['herbalism', 'cooking'], note: 'Brews salves and tinctures, sold at the village market on market days.' },
    history: [
      { date: 'Spring 1180', icon: '🍼', text: 'Born in the village, daughter of a midwife.' },
      { date: 'Winter 1195', icon: '🌿', text: 'Her grandmother taught her the secrets of herb-lore.' },
      { date: 'Summer 1203', icon: '💍', text: 'Married Sam at the village green.' },
      { date: 'Summer 1209', icon: '👶', text: 'Gave birth to Robin.' }] },

  { id: 'robin', name: 'Robin', role: 'Child', species: 'human', age: 7, scale: 0.68, headScale: 1.22,
    look: { skin: 0xf2c4a0, hair: 0xd9a441, hairStyle: 'messy', outfit: 'tunic', shirt: 0x7a9a5a, pants: 0x8a6a48,
      eyes: 'big', eyeColor: 0x4a8a3a, brows: 'thin', nose: 'button', mouth: 'grin', freckles: 8, headwear: 'hood', headwearColor: 0xb8433f },
    start: { x: -2.4, z: 1.2, yaw: 0.8 },
    bio: 'Fearless, loud and certain that a great adventure is just over the hill. Robin has heard every hero tale in the village twice.',
    traits: ['adventurous', 'sociable', 'stubborn'], likes: ['tales', 'socializing', 'music'], dislikes: ['bathing'],
    skills: { music: 1, fighting: 0 },
    relations: [
      { with: 'sam', label: 'Father', aff: 88, note: 'Wants to make Father proud.' },
      { with: 'maya', label: 'Mother', aff: 90, note: 'Loves her stories, hates her baths.' }],
    goals: [{ id: 'hero', title: 'Become a hero', desc: 'Robin will be a famous hero one day, whatever Mother says.',
      steps: [{ text: 'Hear the heroes’ tales', check: { tag: 'tales', n: 4 } }, { text: 'Get a sword', check: { flag: 'sword' } }, { text: 'Learn to fight', check: { skill: 'fighting', level: 2 } }, { text: 'Slip away on a quest', check: { flag: 'quest' } }] }],
    dream: null,
    job: { title: 'Child', place: null, hours: null, wage: 0, skills: [], note: 'Too young to work. At twelve, Robin may be taken on as an apprentice.', future: ['Farmhand', 'Smith’s apprentice', 'Hero?'] },
    history: [
      { date: 'Summer 1209', icon: '👶', text: 'Born in the Eastwood cottage.' },
      { date: 'Spring 1213', icon: '🗡️', text: 'Whittled a first wooden sword and declared a knighthood.' },
      { date: 'Winter 1215', icon: '📖', text: 'Heard the tale of the dragon-slayer at the midwinter feast.' }] },
];
