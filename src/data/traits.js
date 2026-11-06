// Personality building blocks. Everything here is data; sim/life.js applies the effects.
// Activity tags link furniture to likes/dislikes, wishes, goals and skill training.
export const TAGS = {
  music: { icon: '🎵', label: 'Music' }, reading: { icon: '📖', label: 'Reading' }, tales: { icon: '⚔️', label: 'Hero tales' },
  cooking: { icon: '🍲', label: 'Cooking' }, eating: { icon: '🍞', label: 'Hearty meals' }, gardening: { icon: '🌿', label: 'Gardening' },
  socializing: { icon: '🗣️', label: 'Company' }, resting: { icon: '🛋️', label: 'Lazing about' }, bathing: { icon: '🛁', label: 'Bathing' },
  sleeping: { icon: '🌙', label: 'Sleeping in' }, fishing: { icon: '🎣', label: 'Fishing' },
  'sword-fighting': { icon: '🗡️', label: 'Sword fighting' }, painting: { icon: '🖌️', label: 'Painting' },
};

// effects: decay (multiplier on need drain), skillGain, relGain, weights (how much they favour an activity tag)
export const TRAITS = {
  hardworking: { icon: '💪', name: 'Hardworking', desc: 'Tires faster, but learns skills quickly.', decay: { sleep: 1.1 }, skillGain: 1.25 },
  quiet: { icon: '🤫', name: 'Quiet', desc: 'Content with little company; slow to open up.', decay: { social: 0.65 }, relGain: 0.85 },
  sociable: { icon: '🎉', name: 'Sociable', desc: 'Craves company and makes friends easily.', decay: { social: 1.4 }, relGain: 1.3 },
  hearty: { icon: '🍖', name: 'Hearty appetite', desc: 'Always hungry; loves a full table.', decay: { hunger: 1.3 }, weights: { eating: 1.4 } },
  curious: { icon: '🔍', name: 'Curious', desc: 'Bored easily; devours books and tales.', decay: { fun: 1.2 }, skillGain: 1.1, weights: { reading: 1.4, tales: 1.3 } },
  dreamer: { icon: '☁️', name: 'Dreamer', desc: 'Drifts off into music and daydreams.', decay: { fun: 1.15 }, weights: { music: 1.3, resting: 1.2 } },
  lazy: { icon: '😴', name: 'Lazy', desc: 'Sleeps in and loves a soft seat.', decay: { sleep: 1.3 }, weights: { resting: 1.5, sleeping: 1.3 } },
  kind: { icon: '💛', name: 'Kind-hearted', desc: 'Warms to people quickly.', relGain: 1.3 },
  adventurous: { icon: '🧭', name: 'Adventurous', desc: 'Restless; hates sitting still.', decay: { fun: 1.3 }, weights: { resting: 0.6, tales: 1.4 } },
  tidy: { icon: '🧼', name: 'Tidy', desc: 'Cannot stand being dirty.', decay: { hygiene: 1.4 }, weights: { bathing: 1.5 } },
  practical: { icon: '🛠️', name: 'Practical', desc: 'Learns useful skills; favours homely chores.', skillGain: 1.15, weights: { gardening: 1.2, cooking: 1.2 } },
  stubborn: { icon: '🪨', name: 'Stubborn', desc: 'Slow to change; slower to learn new things.', skillGain: 0.9, relGain: 0.9 },
  // from the content spreadsheet
  creative: { icon: '🎨', name: 'Creative', desc: 'Likes to paint, sculpt and use their creativity.', decay: { fun: 1.1 }, skillGain: 1.05, weights: { painting: 1.5, music: 1.2 } },
  virtuous: { icon: '🎶', name: 'Virtuous', desc: 'Loves music and singing. Their song can affect others’ emotions.', decay: { social: 1.1 }, relGain: 1.15, weights: { music: 1.5, socializing: 1.1 } },
  'short-tempered': { icon: '💢', name: 'Short-tempered', desc: 'Easily irritated by others. Stands their ground.', decay: { social: 1.1 }, relGain: 0.8, weights: { 'sword-fighting': 1.2, socializing: 0.8 } },
  mystical: { icon: '🔮', name: 'Mystical', desc: 'Interested in magic and supernatural things.', decay: { sleep: 0.9 }, skillGain: 1.1, weights: { reading: 1.3, tales: 1.2 } },
  natural: { icon: '🌳', name: 'Natural', desc: 'Loves nature. Can speak to plants.', decay: { hygiene: 0.8 }, skillGain: 1.05, weights: { gardening: 1.5, fishing: 1.2 } },
  'animal-friend': { icon: '🐾', name: 'Animal Friend', desc: 'Always needs a pet around. Can talk to animals.', decay: { social: 0.9, hygiene: 0.9 }, relGain: 1.1, weights: { gardening: 1.1, fishing: 1.1 } },
  lonewolf: { icon: '🐺', name: 'Lonewolf', desc: 'Needs time alone. Uneasy in groups, but very comfortable once close to someone.', decay: { social: 0.6 }, relGain: 0.8, weights: { socializing: 0.6, fishing: 1.4, reading: 1.2 } },
  mischievous: { icon: '😈', name: 'Mischievous', desc: 'Loves to see chaos unfold. Playing pranks is extra fun to them.', decay: { social: 1.1, fun: 1.25 }, weights: { socializing: 1.2, tales: 1.1 } },
  fit: { icon: '🏋️', name: 'Fit', desc: 'Loves exercising and physical work.', decay: { hunger: 1.2, hygiene: 1.1, sleep: 1.1 }, weights: { 'sword-fighting': 1.4, resting: 0.7 } },
  coward: { icon: '🐔', name: 'Coward', desc: 'Easily scared by noises, darkness and the supernatural.', decay: { social: 1.1, sleep: 1.15 }, weights: { 'sword-fighting': 0.4, resting: 1.2 } },
  lucky: { icon: '🍀', name: 'Lucky', desc: 'Some people just seem to succeed at everything first try.', skillGain: 1.1, relGain: 1.05, weights: { fishing: 1.3 } },
};

export const SKILLS = {
  cooking: { icon: '🍲', name: 'Cooking' }, herbalism: { icon: '🌿', name: 'Herbalism' }, music: { icon: '🎵', name: 'Music' },
  lore: { icon: '📖', name: 'Lore' }, woodcraft: { icon: '🪓', name: 'Woodcraft' }, fighting: { icon: '⚔️', name: 'Fighting' },
  trading: { icon: '⚖️', name: 'Trading' }, magic: { icon: '✨', name: 'Magic' },
  fishing: { icon: '🎣', name: 'Fishing' }, painting: { icon: '🖌️', name: 'Painting' },
};

// Short-term wishes. `need` biases which wish a person is likely to form.
export const WISHES = [
  { id: 'music', text: 'Play a tune on the harp', tag: 'music', need: 'fun' },
  { id: 'read', text: 'Read a book', tag: 'reading', need: 'fun' },
  { id: 'tales', text: 'Read tales of heroes', tag: 'tales', need: 'fun' },
  { id: 'cook', text: 'Cook a hearty stew', tag: 'cooking', need: 'hunger' },
  { id: 'meal', text: 'Share a meal at the table', tag: 'eating', need: 'hunger' },
  { id: 'herbs', text: 'Tend the herbs', tag: 'gardening', need: 'fun' },
  { id: 'bathe', text: 'Take a proper bath', tag: 'bathing', need: 'hygiene' },
  { id: 'rest', text: 'Rest on the settle', tag: 'resting', need: 'sleep' },
  { id: 'sleep', text: 'Have a good night’s sleep', tag: 'sleeping', need: 'sleep' },
  { id: 'fish', text: 'Spend a quiet hour fishing', tag: 'fishing', need: 'fun' },
  { id: 'spar', text: 'Practise swordplay', tag: 'sword-fighting', need: 'fun' },
  { id: 'paint', text: 'Paint something beautiful', tag: 'painting', need: 'fun' },
  { id: 'together', text: 'Spend an evening with family', tag: 'together', need: 'social' },
];
