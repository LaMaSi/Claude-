# Little Lives (prototype)

Low-poly 3D life sim. Fixed isometric camera, family of three, day/night cycle.

    npm install
    npm run dev      # open on phone via the Network URL

Controls: tap a family member (or their chip) to select. Tap the floor to walk, tap furniture to use it.
Pinch / mouse wheel to zoom, drag to pan. Unselected people live on their own.
URL options: `?t=22` sets the hour, `?speed=3` speeds up the simulation.

Layout: `src/data/` pure data (house, furniture, family) · `src/sim/` headless simulation + pathfinding ·
`src/render/` three.js models and animation · `src/input.js` camera rig and gestures.
