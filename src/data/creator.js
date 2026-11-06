// Everything the character creator can offer or generate. Pure data: adding an entry widens the random pool and the pickers.
export const MAX_MEMBERS = 8, MAX_INFANTS = 2, MAX_TRAITS = 3, MAX_LIKES = 3, MAX_DISLIKES = 2, MAX_SKILLS = 2;

// ---- looks ------------------------------------------------------------------------------------------------------
export const SKINS = [['Pale', 0xf6d9c4], ['Fair', 0xf0c4a0], ['Tan', 0xe0a97c], ['Olive', 0xc9955f], ['Brown', 0xa8714a], ['Deep', 0x7a4a30], ['Ebony', 0x56331f]];
export const HAIR_COLORS = [['Raven', 0x1a1417], ['Black', 0x2e2a33], ['Chestnut', 0x5b3a29], ['Walnut', 0x7a5a3a], ['Auburn', 0x9a3a22], ['Red', 0xc2491f], ['Ginger', 0xd9772a],
  ['Blonde', 0xe3c46c], ['Flaxen', 0xefdc9a], ['Grey', 0x8a8a8e], ['Silver', 0xd8d8dc], ['White', 0xeeeeee]];
export const EYE_COLORS = [['Brown', 0x4a3a2c], ['Hazel', 0x7a6a3a], ['Green', 0x3a8a6a], ['Blue', 0x5a8ac8], ['Grey', 0x7a8a9a], ['Amber', 0xb07a2a], ['Violet', 0x8a5ac8]];
export const CLOTH_COLORS = [['Blue', 0x4f7a9c], ['Plum', 0x9a4a6a], ['Moss', 0x7a9a5a], ['Brick', 0xb8433f], ['Ochre', 0xd9a441], ['Green', 0x5f8a58], ['Stone', 0x8a7a68],
  ['Violet', 0x6a5a7a], ['Rust', 0xc2742a], ['Navy', 0x3f4f7a], ['Linen', 0xf0e8d4], ['Umber', 0x5a4a3a], ['Teal', 0x4f8a8a], ['Rose', 0xc2788a]];
export const OPTIONS = {
  jaw: ['oval', 'round', 'long', 'heart', 'pear', 'square', 'chubby'],
  eyes: ['dot', 'big', 'wide', 'sleepy', 'narrow', 'happy'],
  brows: ['none', 'thin', 'thick', 'bushy', 'arched', 'angry', 'worried'],
  nose: ['button', 'big', 'long', 'pointy', 'hook'],
  mouth: ['smile', 'grin', 'smirk', 'flat', 'frown', 'open', 'o', 'tiny'],
  ears: ['round', 'big', 'pointy'],
  hairStyle: ['short', 'messy', 'shaggy', 'curly', 'puff', 'long', 'bob', 'bun', 'twinbuns', 'topknot', 'ponytail', 'braid', 'braids', 'pigtails', 'spiky', 'spikes', 'wild', 'swept', 'tonsure', 'receding', 'bald'],
  headwear: [null, 'coif', 'kerchief', 'hood', 'flatcap', 'strawhat', 'pointed', 'bakerhat', 'circlet', 'helm'],
  facial: ['none', 'mustache', 'curly', 'goatee', 'sideburns', 'mutton', 'full', 'long'],
  outfit: ['tunic', 'gown', 'dress', 'robe', 'smith', 'jerkin', 'noble', 'knight', 'adventurer', 'ranger'],
  accessories: ['glasses', 'eyepatch', 'scar', 'earring', 'headband'],
};
// per-stage limits on what the pickers and the randomiser may offer
export const STAGE_OPTIONS = {
  infant: { hairStyle: ['bald', 'short', 'curly', 'puff', 'messy'], headwear: [null, 'coif', 'hood'], facial: ['none'], outfit: ['tunic', 'dress', 'robe'], accessories: [], brows: ['none', 'thin'], mouth: ['smile', 'grin', 'o', 'tiny', 'open'] },
  child: { hairStyle: ['short', 'messy', 'curly', 'puff', 'bob', 'bun', 'twinbuns', 'ponytail', 'braid', 'braids', 'pigtails', 'spikes', 'swept', 'bald'], headwear: [null, 'coif', 'kerchief', 'hood', 'flatcap', 'strawhat'], facial: ['none'], outfit: ['tunic', 'dress', 'jerkin', 'ranger'], accessories: ['glasses', 'headband'] },
  adult: {}, senior: { hairStyle: ['short', 'curly', 'long', 'bob', 'bun', 'braid', 'tonsure', 'receding', 'bald', 'shaggy', 'swept'] },
};
export const LABELS = { o: 'Surprised', tiny: 'Tiny', bakerhat: 'Baker’s hat', strawhat: 'Straw hat', flatcap: 'Flat cap', pointed: 'Pointed hat', bob: 'Bob', twinbuns: 'Twin buns', topknot: 'Topknot',
  mutton: 'Mutton chops', mustache: 'Moustache', curly: 'Curly', receding: 'Receding', tonsure: 'Tonsure', hook: 'Hooked', dot: 'Dots', big: 'Big', wide: 'Wide', sleepy: 'Sleepy', narrow: 'Narrow',
  happy: 'Smiling', pear: 'Pear', heart: 'Heart', chubby: 'Round-full', none: 'None', puff: 'Puff', spikes: 'Cowlick', hood: 'Hood', coif: 'Coif', helm: 'Helm', circlet: 'Circlet' };
export const label = (v) => (v == null ? 'None' : LABELS[v] ?? v.charAt(0).toUpperCase() + v.slice(1));
export const optionsFor = (stage, field) => STAGE_OPTIONS[stage]?.[field] ?? OPTIONS[field];

// ---- names -----------------------------------------------------------------------------------------------------
export const NAMES = ['Aldric', 'Alder', 'Aveline', 'Bertram', 'Bran', 'Bram', 'Cai', 'Cedric', 'Cora', 'Dagny', 'Dara', 'Dunstan', 'Edda', 'Eira', 'Elowen', 'Fenn', 'Finn', 'Garrick', 'Gisla', 'Greta',
  'Hale', 'Hild', 'Hob', 'Ingrid', 'Isolde', 'Ivo', 'Jasper', 'Jocelyn', 'Jory', 'Kasimir', 'Kellan', 'Kit', 'Linnea', 'Lorin', 'Lyra', 'Mara', 'Maud', 'Merrick', 'Neve', 'Nell', 'Nyle', 'Odette',
  'Orla', 'Osric', 'Perrin', 'Petra', 'Pip', 'Quill', 'Rhys', 'Roland', 'Rowan', 'Sibyl', 'Sorrel', 'Sunniva', 'Tamsin', 'Thea', 'Tobias', 'Ulric', 'Una', 'Vesper', 'Wat', 'Wren', 'Wynn', 'Yara', 'Zeb'];

// ---- backstory pieces ------------------------------------------------------------------------------------------
export const PLACES = ['the Eastwood', 'the village green', 'a riverside mill', 'the hill farms', 'the market town', 'a coastal fishing hamlet', 'a travelling caravan', 'the old abbey'];
export const ORIGINS = ['{n} grew up in {p}.', '{n} was born in {p} during a hard winter.', '{n} came from {p}, and never quite lost the accent.', '{n} spent a restless childhood in {p}.'];
export const EVENTS = ['{n} once got lost in the woods for three days and has never feared the dark since.', '{n} lost a parent young and learned to fend for {self}.', '{n} grew up on a grandparent’s tall tales.',
  '{n} survived a winter fever that took half the village.', '{n} won a wrestling match at the harvest fair and still tells the tale.', '{n} found a hoard of old coins and spent every one in a day.',
  '{n} left a failed harvest behind and never looked back.', '{n} was apprenticed briefly, then walked away.'];
export const TRAIT_LINES = { hardworking: '{n} is first up and last to bed.', quiet: '{n} speaks only when there is something worth saying.', sociable: '{n} cannot pass a stranger without learning their name.',
  hearty: '{n} judges every day by how well it was fed.', curious: '{n} wants to know how everything works, and why.', dreamer: '{n} is often miles away, humming.', lazy: '{n} could sleep through a thunderstorm and often does.',
  kind: '{n} has never turned away a hungry soul.', adventurous: '{n} is certain something wonderful lies over the next hill.', tidy: '{n} cannot rest in a messy room.', practical: '{n} fixes things before anyone has noticed they are broken.',
  stubborn: '{n} will not be told twice, or once.' };
export const BABY_LINES = ['{n} is new to the world and already the centre of the household.', '{n} arrived in the cold months and has been loudly demanding supper ever since.'];
export const CHILD_LINES = ['{n} has endless energy and no sense of danger.', '{n} collects stones, stories and scraped knees.'];
export const SENIOR_LINES = ['{n} has seen many winters and keeps the best stories for the long nights.', '{n} knows the old ways, and is happy to say so.'];
export const LIFE_EVENTS = {
  child: ['Took first steps in {p}.', 'Learned to whistle through a blade of grass.', 'Got lost at the market and was found asleep in a cart.', 'Fell out of an apple tree and landed on a very surprised goat.'],
  adult: ['Survived a bitter winter.', 'Left {p} to start anew.', 'Won second prize at the harvest fair.', 'Lost something precious and found something else instead.', 'Took up the work of a {job}.'],
  senior: ['Became a keeper of the old stories.', 'Buried a dear friend and planted an oak in their honour.', 'Took up the work of a {job}.', 'Taught a neighbour’s child to read.'],
};
export const DREAMS = ['Something beyond the forest is stirring, though the heart does not know it yet.', 'There is a loss never quite made peace with.', 'An old song keeps returning, and with it a longing.',
  'A distant city glitters in an old story and will not leave the mind.', 'A secret talent waits for the right moment.'];

// ---- jobs by best skill ----------------------------------------------------------------------------------------
export const JOBS = {
  woodcraft: { title: 'Woodcutter', place: 'The Eastwood edge', hours: [7, 17], wage: 6, note: 'Fells and hauls timber for the village mill.' },
  herbalism: { title: 'Herbalist', place: 'The cottage garden', hours: [8, 16], wage: 4, note: 'Brews salves and tinctures, sold at the village market.' },
  cooking: { title: 'Cook', place: 'The market stalls', hours: [9, 18], wage: 4, note: 'Sells hot pies and stew to travellers and neighbours.' },
  music: { title: 'Minstrel', place: 'The village green', hours: [14, 22], wage: 3, note: 'Plays at feasts and festivals for coin and supper.' },
  lore: { title: 'Scribe', place: 'The old abbey', hours: [8, 16], wage: 5, note: 'Copies letters and ledgers for those who cannot write.' },
  fighting: { title: 'Guard', place: 'The village gate', hours: [6, 18], wage: 6, note: 'Watches the road and keeps the peace.' },
  trading: { title: 'Peddler', place: 'The market town road', hours: [8, 18], wage: 5, note: 'Carries goods between hamlets.' },
  magic: { title: 'Hedge-mage', place: 'The edge of the village', hours: [10, 20], wage: 3, note: 'Offers charms and cures to those who ask no questions.' },
  none: { title: 'Farmhand', place: 'The hill farms', hours: [7, 17], wage: 3, note: 'Turns a hand to whatever the season asks.' },
};

// ---- life goals --------------------------------------------------------------------------------------------------
// steps: check = {skill, level} | {tag, n} | {flag} | {aff:{with:'$other',min}}   ($other = another member, filled in on finalising)
export const GOALS = [
  { id: 'hero', title: 'Become a hero', desc: '{n} dreams of glory, a sword and a song about it.', stages: ['child', 'adult'], likes: ['tales'], traits: ['adventurous'],
    steps: [{ text: 'Hear the heroes’ tales', check: { tag: 'tales', n: 4 } }, { text: 'Get a sword', check: { flag: 'sword' } }, { text: 'Learn to fight', check: { skill: 'fighting', level: 2 } }, { text: 'Slip away on a quest', check: { flag: 'quest' } }] },
  { id: 'warm-home', title: 'A warm, full home', desc: 'Keep the household fed and the hearth burning through the winter.', stages: ['adult', 'senior'], likes: ['cooking', 'eating'], traits: ['practical', 'hearty'],
    steps: [{ text: 'Cook a stew for the family', check: { tag: 'cooking', n: 4 } }, { text: 'Share eight meals at the table', check: { tag: 'eating', n: 8 } }, { text: 'Sleep soundly six nights', check: { tag: 'sleeping', n: 6 } }] },
  { id: 'herb-wife', title: 'Master of remedies', desc: 'Become the finest healer of herbs in the valley.', stages: ['adult', 'senior'], likes: ['gardening', 'reading'], traits: ['curious', 'kind'],
    steps: [{ text: 'Tend the herbs often', check: { tag: 'gardening', n: 4 } }, { text: 'Reach Herbalism level 5', check: { skill: 'herbalism', level: 5 } }, { text: 'Study the old books', check: { skill: 'lore', level: 4 } }] },
  { id: 'minstrel', title: 'A song to be remembered', desc: '{n} wants to write a tune that outlives them.', stages: ['child', 'adult', 'senior'], likes: ['music'], traits: ['dreamer', 'sociable'],
    steps: [{ text: 'Play six tunes', check: { tag: 'music', n: 6 } }, { text: 'Reach Music level 4', check: { skill: 'music', level: 4 } }, { text: 'Perform for the village', check: { flag: 'performance' } }] },
  { id: 'scholar', title: 'The learned one', desc: '{n} will read every book within a day’s walk.', stages: ['child', 'adult', 'senior'], likes: ['reading'], traits: ['curious'],
    steps: [{ text: 'Read six times', check: { tag: 'reading', n: 6 } }, { text: 'Reach Lore level 5', check: { skill: 'lore', level: 5 } }, { text: 'Find a rare book', check: { flag: 'rare_book' } }] },
  { id: 'see-city', title: 'See the great city', desc: 'The big city calls from beyond the forest.', stages: ['child', 'adult', 'senior'], traits: ['adventurous', 'dreamer'],
    steps: [{ text: 'Save travelling coins', check: { flag: 'coins_saved' } }, { text: 'Learn the road', check: { flag: 'road_known' } }, { text: 'Leave home for the first time', check: { flag: 'left_home' } }] },
  { id: 'open-shop', title: 'A shop of one’s own', desc: '{n} wants a stall with their name above it.', stages: ['adult'], traits: ['practical', 'hardworking'],
    steps: [{ text: 'Save coins for a stall', check: { flag: 'coins_saved' } }, { text: 'Buy a market stall', check: { flag: 'stall_bought' } }, { text: 'Find adventurers to bring goods', check: { flag: 'adventurers_hired' } }] },
  { id: 'close-bond', title: 'Grow close to {other}', desc: '{n} wants a truly strong bond with {other}.', stages: ['child', 'adult', 'senior'], needsOther: true, traits: ['kind', 'sociable'],
    steps: [{ text: 'Spend time together', check: { tag: 'socializing', n: 5 } }, { text: 'Grow close to {other}', check: { aff: { with: '$other', min: 92 } } }] },
  { id: 'clean-living', title: 'A spotless home', desc: '{n} cannot rest until everything is clean.', stages: ['adult', 'senior'], likes: ['bathing'], traits: ['tidy'],
    steps: [{ text: 'Wash up six times', check: { tag: 'bathing', n: 6 } }, { text: 'Tend the herbs', check: { tag: 'gardening', n: 3 } }] },
  { id: 'legacy', title: 'Pass on what I know', desc: '{n} wants someone to carry the old knowledge on.', stages: ['senior'], traits: ['kind', 'curious'],
    steps: [{ text: 'Tell hero tales', check: { tag: 'tales', n: 3 } }, { text: 'Teach someone a skill', check: { flag: 'taught_someone' } }] },
  { id: 'good-childhood', title: 'A happy childhood', desc: '{n} wants lots of games, stories and sweet things.', stages: ['child'], likes: ['music', 'socializing', 'tales'], traits: ['sociable'],
    steps: [{ text: 'Play with the family', check: { tag: 'socializing', n: 4 } }, { text: 'Hear a hero tale', check: { tag: 'tales', n: 2 } }, { text: 'Make music', check: { tag: 'music', n: 3 } }] },
];

// ---- relationships --------------------------------------------------------------------------------------------
// code = how a relates to b (a is the first member listed). labels: what each calls the other; aff: starting bond range
export const RELATIONS = {
  housemate: { name: 'Housemates', ab: 'Housemate', ba: 'Housemate', aff: [15, 35], note: 'Still finding their way around each other.' },
  friend: { name: 'Friends', ab: 'Friend', ba: 'Friend', aff: [50, 70], note: 'Fond of each other’s company.' },
  partner: { name: 'Partners', ab: 'Partner', ba: 'Partner', aff: [72, 90], note: 'Share a life, a bed and most of the chores.' },
  sibling: { name: 'Siblings', ab: 'Sibling', ba: 'Sibling', aff: [60, 82], note: 'Quarrel easily and forgive faster.' },
  'parent:ab': { name: '{a} is parent of {b}', ab: 'Child', ba: 'Parent', aff: [78, 92], note: 'Family above all.' },
  'parent:ba': { name: '{b} is parent of {a}', ab: 'Parent', ba: 'Child', aff: [78, 92], note: 'Family above all.' },
  'grand:ab': { name: '{a} is grandparent of {b}', ab: 'Grandchild', ba: 'Grandparent', aff: [72, 90], note: 'Full of stories and sweet things.' },
  'grand:ba': { name: '{b} is grandparent of {a}', ab: 'Grandparent', ba: 'Grandchild', aff: [72, 90], note: 'Full of stories and sweet things.' },
};
// two traits that cannot be combined at creation
export const TRAIT_CONFLICTS = [['hardworking', 'lazy'], ['quiet', 'sociable'], ['adventurous', 'lazy'], ['dreamer', 'practical'], ['tidy', 'lazy']];
