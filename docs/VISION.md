# Little Lives: vision and roadmap

## The pitch
A slice of medieval life. A handful of households in a fantasy village, each person a distinct individual with a
personality, wishes and long-term goals. Their stories are shaped equally by **random events** and **the player's
decisions**. The player is a guiding hand, not a puppeteer: you steer, nudge and choose, and people still live their own lives.
Played to relax at night: warm candlelight, a quiet world, small human dramas.

## Pillars
1. **Every person is someone.** Traits, likes/dislikes, skills, relationships and history make each character behave, react
   and grow differently. Two people given the same room will do different things.
2. **Wanting something.** Short-term wishes and long-term life goals give every character direction and give the player
   things to help with or complicate.
3. **Stories emerge.** Events (visitors, illness, birth, death, rumours) plant new wishes and break old ones. The same
   systems should be able to tell a hero story, a grief story, a wanderlust story and a shopkeeper story.
4. **Cosy, readable, touch-first.** Thumb-zone UI, low-poly night-lit diorama, nothing fiddly.
5. **Not only humans.** Species are pluggable bodies; later folk (goblins, wolf-kin...) share the same personality systems.

## The stories we are building toward (and what each needs)
| Story | Needs |
|---|---|
| A farm family's child wants to be a hero. How do they sneak away and get a sword? | Goals with gated steps and story flags (`sword`, `quest`), a way to acquire items, leaving home/curfew, parents who notice and react, fighting skill, a first real quest |
| A husband dies of illness; his widow turns to dark magic to revive him | Illness events, death, grief (mood and needs), a dormant "dark" goal awakened by loss, forbidden knowledge/books, morality and reputation, consequences |
| A lifelong woodcutter is told about the big city by a passing noble, and now wants to move | Visitor NPCs, dormant dreams awakened by events, a new long-term goal, saving money, leaving or moving household |
| Someone opens a shop; adventurers collect loot to sell | Money, shops/occupations, adventurers and loot, supply and demand, other towns |

## What exists today (prototype)
- Fixed-camera low-poly diorama, medieval cottage, day/night with night as the hero look.
- **Random households**: `src/data/generator.js` builds a whole household (couple / single parent / siblings, with children) from a seed: names, looks, traits, tastes, skills, jobs, bios, relationships, goals, dreams and history. `?seed=abc` replays one, 🎲 rolls a new one, `?family=1` loads the hand-written Sam/Maya/Robin.
- Every activity tag has at least one object (fishing pond, easel, training dummy exist as furniture but are not placed in the starting cottage yet).
- A household of people with: needs (hunger, social, hygiene, fun, rest), mood, **traits** that change how needs drain and what they choose,
  **likes/dislikes** that steer behaviour and mood, **skills** trained by doing, **wishes** that appear and are fulfilled,
  **goals** with progress, **relationships** that grow or strain, an **occupation** (data only), and a **history** that records life events.
- A parametric character look system (20-variant showcase page).
- Character panel tabs: Needs, Bonds, Wishes, Likes, Skills, Work, Past.
- Unselected people live on their own, driven by needs, personality and preferences.
- Story flags (`sim.setFlag('sword')`) and a calendar exist so events can plug in.

## Architecture rules (keep these true)
- `src/data/*` is pure data: traits, skills, furniture, family. New people, traits and activities are data, not code.
- `src/sim/*` is headless: it runs without graphics so many households can be simulated and tested in Node.
- `src/render/*` only reads sim state. Species are builders in `SPECIES`; the animation layer depends only on named body parts.
- Anything that changes a person's life goes through the sim (`log`, `setFlag`, goals), so history and goals stay truthful.

## Roadmap
1. **Acting with purpose** (next): long-press radial menu on people, furniture and ground; direct orders ("do it now") with an
   optional queue; clear feedback (path line, target highlight, intent icons); disabled options explain why.
2. **Events and choices**: an event engine (random and conditional), event cards with player choices, visitors and NPCs,
   awakening dormant dreams, consequences recorded in History. First events: the passing noble, an illness, a hero's tale.
3. **Life cycle**: ageing, birth, death, grief, inheritance, children growing into apprentices.
4. **Economy and work**: money, jobs with real work days, shops, simple trading.
5. **Build and decorate**: room templates, free-ish furniture placement using the bottom panel as the catalogue.
6. **The village**: more households, adventurers and loot, heroes, travel to other towns.

## Open questions for the player
- How much should unselected people disobey the player's long-term hopes for them (free will vs control)?
- Is death permanent with a lineage continuing, or can magic reverse it, at a cost?
- Should the player be able to read minds (see every wish), or only what the character has revealed?
