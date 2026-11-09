# Decorating: placeable furniture (Godot port)

## Already in place (tested by `godot/tests/decor_test.gd`)
- **Stable item ids.** Every item has `index` (never reused), so slot occupancy and references survive edits.
- **`Sim.can_place(def, x, z, rot, ignore_id)` -> `{ok, reason}`.** Inside the room; no overlap with other furniture
  (rugs and wall hangings may overlap); and the house stays walkable: every usable item's approach point must remain
  reachable from the door (so you cannot wall anyone in or block the bed). Reasons are player-readable ("overlaps Bed",
  "blocks the way to Bed", "outside the room").
- **`Sim.add_item / move_item / remove_item`** (call `can_place` first). They rebuild the nav grid, and anyone using or
  heading to an item is stood up cleanly with the slot released.
- **`Sim.layout_data()` + `Layout.save/load_items`** (`user://house_layout.json`). A missing or corrupt file falls back to
  the default house. `main.gd` already loads a saved layout at startup.
- **`World.add_item_node / move_item_node / remove_item_node`.** Each item is its own node; flames, candle/lantern lights
  and glow pieces are children, so they move with the item. About the same draw-call count as before.

## To build next
1. **Decorate mode** (a button in the dock). While on: characters keep living; the camera still pans/zooms.
   - Tap furniture: select it (outline or lift), show a small toolbar: **Rotate 90°**, **Move**, **Remove**, **Done**.
   - **Move**: drag. Snap to `GRID.snap` (0.25) and rotate in 90° steps. Render a ghost (the item's own model, tinted
     green when `can_place` is ok, red otherwise, with the reason as a label). On release: if ok, `sim.move_item` +
     `world.move_item_node`, then `Layout.save`. If not, spring back.
   - Floor/ground taps never move characters in this mode.
2. **Catalog panel** (bottom sheet, tabs by category): lists `GameData.furniture` entries that are placeable, with a
   thumbnail (render once through `Portraits`-style SubViewports) and name. Tap one: a ghost appears at the view centre;
   drag to place, then confirm.
3. **Data to add to `furniture.json` / `tools/export_data.mjs`:** `category` (sleep, kitchen, comfort, decor, light),
   `price` (when the economy lands), `rotationSteps`, and `placeOn: floor | wall | surface` (candles/plants on tables,
   banners/pictures on walls). `can_place` currently treats `wallMounted` as "anywhere inside"; give it a wall-snap rule.
4. **Persistence UX:** autosave on every confirmed edit; "Reset house" in Options (`Layout.clear`).
5. **Later:** bigger plots / more rooms (the nav grid and `can_place` take the room rect from `house.room`; make it a
   list), walls and floor styles (the wall builder already takes openings as data), and sim reactions to the new layout
   (people favour new furniture; ids are stable so history can mention "the new harp").

## Notes
- New furniture needs three things: a model in `render/models.gd`, an entry in `src/data/furniture.js` (re-export with
  `node tools/export_data.mjs`), and nothing else: the sim, nav grid, picking and placement rules are data-driven.
- Keep model builders pure (they draw at the origin); `World` positions the node. That is what makes moving cheap.
