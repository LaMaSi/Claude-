# Little Lives (prototype)

Low-poly medieval-fantasy life sim. Fixed isometric camera, a family of three, day/night cycle.

    npm install
    npm run dev      # open on phone via the Network URL

Controls: tap a portrait to select (tap it again to hide the needs panel). Tap the floor to walk, tap furniture
to use it. Pinch / mouse wheel to zoom, drag to pan. People you haven't selected live on their own,
driven by their needs (hunger, social, hygiene, fun, rest).
URL options: `?t=22` sets the hour, `?speed=3` speeds up the simulation.

Layout: `src/data/` pure data (house, furniture, family) - `src/sim/` headless simulation, needs, pathfinding -
`src/render/` three.js models, species builders and animation - `src/ui.js` bottom dock - `src/input.js` camera rig.
Characters have a `species` field; add a builder to `SPECIES` in `src/render/people.js` for non-human folk.
