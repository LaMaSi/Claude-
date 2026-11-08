# Little Lives: Godot 4.5 port

Port of the three.js prototype (repo root) to Godot 4.5 for Android. Same data, same simulation, same look.

## Run / test

    godot --path godot                                   # run (Mobile renderer, Vulkan)
    godot --headless --path godot -s tests/sim_test.gd   # 10 simulated minutes, prints needs/wishes/log
    godot --headless --path godot -s tests/geo_test.gd   # mesh winding / normals sanity

Screenshots (software Vulkan works under Xvfb with `mesa-vulkan-drivers`):

    xvfb-run godot --path godot --rendering-method mobile -- --shot=out.png --hour=21.5 --open=bonds
    # more dev flags: --focus=sam --zoom=14 --yaw=0.8   --taptest   --seed=3   --frames=80

Do not pass `--rendering-driver` on the command line: it resets the method to Forward+.

## Data
`godot/data/*.json` and `godot/ui/icons/*.svg` are generated from the JS sources:

    node tools/export_data.mjs && node tools/export_icons.mjs

## Layout
- `sim/` nav grid (identical paths to the JS version), life (needs, wishes, goals), sim
- `render/` `builder.gd` (merges static geometry per material: very few draw calls), `models.gd` (furniture/scenery),
  `world.gd`, `daynight.gd`, `people.gd` + `face.gd`/`face_paint.gd`/`face_baker.gd` (painted faces), `hair.gd`,
  `headwear.gd`, `facialhair.gd`, `characters_view.gd` (animation), `cam_rig.gd` (touch)
- `ui/` `hud.gd` (clock, options, dock, 7 character tabs), `portraits.gd`, `pixel_look.gd`
- `main.gd` wiring, tap picking, layout

## Android
`export_presets.cfg` has an arm64 APK preset (`com.lamasi.littlelives`). You need the Godot 4.5 export templates, a JDK 17,
the Android SDK and a keystore configured in Editor Settings, then:

    godot --headless --path godot --export-debug Android build/little-lives.apk

## Known differences from the web build
- No depth outline in the optional pixel-art look (canvas shaders cannot read depth); posterise + dither + grid are there.
- Box edges are sharp (the web build used 2-segment rounded boxes).
- Lighting is one directional light + tinted ambient, calibrated by eye against the web render (see `GAIN_*` in `daynight.gd`).
  Two directional lights and a sky-sourced ambient both misrendered on software Vulkan, so they are not used.
- Fonts: Alegreya and Nunito Sans (SIL OFL, licences in `ui/fonts/`). Icons: game-icons.net (CC BY 3.0).
