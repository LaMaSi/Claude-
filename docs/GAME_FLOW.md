# Little Lives: game flow and character creation (spec draft)

Status: **draft for review, nothing here is built yet.** Items marked **(assumed)** are my gap-fills, not your decisions.

## Decisions so far
| Topic | Decision |
|---|---|
| Genre | Survival. **Lost when everyone dies** (starvation, a failed adventure, a monster attacking the home). |
| Worlds | A world is a save slot. The player picks a world from the main menu. |
| New world | Create a household, or start with a random one. "Random" opens the same character creator with everything pre-rolled and randomize available as a function inside it. |
| Household size | Up to **8**, no minimum, but **an infants-only household is not allowed**. A lone child, or children with infants, is allowed. |
| Relationships | The player sets them (parent, child, spouse, sibling, friend, unrelated), with sensible defaults from ages. Random mode generates a plausible family. |
| Life stages | Infant, child, adult, senior (rules below). |
| Ageing | **Accelerated life**: a full life in roughly 10-15 hours of play. The player can also trigger an event to force someone to age up (or down, e.g. a youth potion). |
| Traits | Up to **3** at creation (free pick; contradictory pairs blocked). More are earned later from life-changing events. |
| Creator scope | Name, life stage, looks, traits, likes/dislikes, a starting skill, backstory and starting life goal. **Every field can be chosen or randomised.** |
| Difficulty | Chosen per world: **Cozy** (reload allowed, gentler hunger and threats), **Standard**, **Hardcore** (autosave only, no undo). |
| World content (v1) | One hand-made village (the current cottage and garden). **Vision:** randomly generated starting worlds with different resources and levels of civilisation. |

## Flow
```
Boot
 └─ Main menu ── Continue (last world) · Worlds · Settings · Folk showcase
     └─ World select ── [world cards: name, household portraits, day/season, difficulty] · New world · Delete
         └─ New world ── name + difficulty (+ world type later)
             └─ Household ── [ Create a household ]   [ Random household ]
                 └─ Character creator (roster + editor)  ── Start
                     └─ Game (existing prototype)
                         └─ Game over ── recap (who, how, how long) ── back to World select
```
Cozy worlds can be reloaded from the pause menu; Hardcore worlds end for good (recap only).

## Life stages
| Stage | Movement and actions | Needs and survival | Work | Notes |
|---|---|---|---|---|
| **Infant** | Cannot move. Lies in a crib or is carried by someone. Can only be cared for. | Hunger, rest, hygiene, comfort/company. Fully dependent: neglect is the fastest way to lose someone. | No | Needs a carer. If no one is available, the infant slowly declines. |
| **Child** | Smaller body, slower, shorter reach. Many interactions: play, read, chores, music, company. | Normal needs, gentler hunger. **(assumed)** can fetch food from the pantry and cook simple things. | No job. May become an apprentice at a later age. | Cannot go on adventures. |
| **Adult** | Everything. | Normal. | Any job, adventures, fighting. | Default for survival. |
| **Senior** | Slower walking. | Rest drains much faster (tires quickly). Natural death becomes possible near the end of the lifespan. | Reduced hours. Can mentor. **(assumed)** | Lifespan almost over. Wisdom bonus to lore and teaching. |

Ageing pace (accelerated, **assumed** first tuning): infant → child ≈ 1.5 h, child → adult ≈ 3 h, adult → senior ≈ 6 h, senior → natural death ≈ 3 h of play. Age-up or age-down events can move a character at any time; infants cannot be aged down.

## Character creator
A phone-first screen in the existing dark-wood style.
- **Roster row** at the bottom (same portrait row as in game), `+` to add (max 8), tap to select, long-press to remove or duplicate.
- **Editor panel** above it with tabs: **Look · Who · Traits · Likes & Skill · Story**.
  - **Look:** hair, face, skin, outfit (built from the parametric system in `src/render/people.js`; being refined by the visual-style session).
  - **Who:** name, life stage.
  - **Traits:** pick up to 3; each shows its effect in one line; contradicting pairs are greyed out with the reason.
  - **Likes & Skill:** up to 3 likes, up to 2 dislikes, one starting skill with a level appropriate to the stage.
  - **Story:** short backstory (pick from generated options or write a line) and a starting life goal.
- **Randomise everywhere:** each field has a dice button, plus a 🔒 to keep a field while rerolling others. "Randomise character" and "Randomise household" at the top.
- **Relationships step** after the roster: for each member, relation to the first member (parent, child, spouse, sibling, friend, unrelated), the rest are derived and can be edited.
- **Validation, always visible as a small checklist:** at least one member; at most 8; not infants-only; every name set and unique; at most 3 traits each; no conflicting traits. The Start button stays disabled with the reason shown.

### Trait conflicts (proposed, edit in the spreadsheet)
hardworking ⟂ lazy · quiet ⟂ sociable · adventurous ⟂ lazy · dreamer ⟂ practical · tidy ⟂ lazy.
Earned traits (from life events) bypass the creation limit but still respect conflicts unless an event explicitly replaces one.

## Data and save model (sketch)
- A created character has the same shape as an entry in `src/data/family.js`, plus `stage` (`infant|child|adult|senior`), `ageYears`, `lifespan` and `lockedFields` (creator only).
- `src/data/stages.js` (new): per-stage scale, speed, need multipliers, allowed activities, pace of ageing.
- A **world** is `{ id, name, difficulty, seed, worldType, date, household[], flags, events[], stats }`. The simulation already runs headless, so saving is serialising sim state.
- Randomisers are pure functions over the content tables (the spreadsheet lists), so adding new traits, likes or goals there automatically widens the random pool.

## World generation (vision, not v1)
Starting worlds differ in **resources** (fertile, forest, mountain, coast, ruins) and **civilisation level** (lone homestead, hamlet, village, market town). These set food supply, neighbours, jobs, dangers and who can visit, and therefore which stories are likely. v1 keeps the single authored village, but the world object already carries `worldType` and `seed` so generation can be added without breaking saves.

## Open points
See the questions raised alongside this document.
