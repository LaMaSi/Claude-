class_name Models
extends RefCounted
## Procedural low-poly medieval-fantasy models, ported from src/render/models.js.
## Each function draws into a Builder positioned at the item's origin (floor level, centred on its footprint,
## local +z = front). Units are roughly metres.

const FLAME := {"emissive": 0xff9a2e, "emissive_intensity": 1.6, "roughness": 0.6}


static func build_furniture(b: Builder, def: String) -> void:
	match def:
		"bed": bed(b)
		"pantry": pantry(b)
		"hearth": hearth(b)
		"tub": tub(b)
		"washstand": washstand(b)
		"settle": settle(b)
		"harp": harp(b)
		"table": table(b)
		"stool": stool(b)
		"plant": plant(b)
		"candlestand": candlestand(b)
		"bookshelf": bookshelf(b)
		"rug": rug(b)
		"banner": banner(b)
		"chest": chest(b)
		"barrel": barrel(b)
		_: push_warning("no model for furniture '%s'" % def)


static func build_scenery(b: Builder, type: String) -> void:
	match type:
		"tree": tree(b)
		"pine": pine(b)
		"bush": bush(b)
		"flowers": flowers(b)
		"well": well(b)
		"haystack": haystack(b)
		"veg": veg_patch(b)
		"lantern": lantern(b)
		"barrel": barrel(b)
		_: push_warning("no model for scenery '%s'" % type)


# ---- furniture --------------------------------------------------------------
static func bed(b: Builder) -> void:
	b.box(1.7, 0.3, 2.1, Pal.OAK_DARK, 0, 0, 0)
	for sx in [-1.0, 1.0]:
		for sz in [-1.0, 1.0]:
			b.box(0.1, 0.5, 0.1, Pal.OAK, sx * 0.8, 0, sz * 1.0)
	b.box(1.6, 0.2, 2.0, Pal.LINEN, 0, 0.3, 0.02)            # straw mattress (top = 0.5)
	b.box(1.62, 0.1, 1.15, Pal.WOOL, 0, 0.44, 0.42)           # wool blanket
	b.box(1.64, 0.105, 0.14, Pal.WOOL_OCHRE, 0, 0.44, 0.06)   # stripes
	b.box(1.64, 0.105, 0.08, Pal.WOOL_OCHRE, 0, 0.44, 0.9)
	b.box(0.64, 0.13, 0.4, Pal.CREAM, -0.4, 0.5, -0.72)       # pillows
	b.box(0.64, 0.13, 0.4, Pal.CREAM, 0.4, 0.5, -0.72)
	b.box(1.8, 1.0, 0.13, Pal.OAK, 0, 0, -1.07)               # headboard
	b.box(1.9, 0.12, 0.17, Pal.OAK_LIGHT, 0, 1.0, -1.07)
	for sx in [-1.0, 1.0]:
		b.ball(0.08, Pal.GOLD, sx * 0.9, 1.12, -1.07, 1)
	b.box(1.8, 0.45, 0.1, Pal.OAK, 0, 0, 1.06)                # footboard


static func pantry(b: Builder) -> void:
	b.box(0.9, 1.75, 0.55, Pal.OAK, 0, 0, 0)
	b.box(0.98, 0.07, 0.62, Pal.OAK_DARK, 0, 1.75, 0)
	b.box(0.4, 0.8, 0.03, Pal.OAK_LIGHT, -0.21, 0.15, 0.285); b.box(0.4, 0.8, 0.03, Pal.OAK_LIGHT, 0.21, 0.15, 0.285)
	b.box(0.4, 0.6, 0.03, Pal.OAK_LIGHT, -0.21, 1.0, 0.285); b.box(0.4, 0.6, 0.03, Pal.OAK_LIGHT, 0.21, 1.0, 0.285)
	for x in [-0.05, 0.05]:
		for y in [0.55, 1.3]:
			b.ball(0.025, Pal.IRON, x, y, 0.32, 0)
	b.cyl(0.18, 0.18, 0.1, Pal.WOOL_OCHRE, 0.15, 1.82, 0, 12)  # cheese wheel
	b.box(0.28, 0.1, 0.16, 0xd9a86a, -0.2, 1.82, 0.02)         # loaf
	b.cyl(0.01, 0.01, 0.25, Pal.LEATHER, 0.5, 1.45, 0.1, 4)    # hanging herbs
	b.ball(0.07, Pal.LEAF_DARK, 0.5, 1.28, 0.1, 1, 1.5); b.ball(0.05, Pal.LEAF, 0.56, 1.35, 0.14, 0)


static func hearth(b: Builder) -> void:
	b.box(1.7, 0.2, 0.75, Pal.STONE_DARK, 0, 0, 0)
	for sx in [-1.0, 1.0]:
		b.box(0.38, 1.15, 0.65, Pal.STONE, sx * 0.65, 0.2, -0.02)
	b.box(1.7, 0.32, 0.65, Pal.STONE_LIGHT, 0, 1.2, -0.02)     # mantel
	b.box(0.92, 0.95, 0.08, 0x2a2420, 0, 0.2, -0.3)            # sooty back
	b.box(1.5, 1.0, 0.5, Pal.STONE, 0, 1.52, -0.1)             # chimney breast
	b.box(0.95, 1.7, 0.45, Pal.STONE_DARK, 0, 2.5, -0.12)      # stack (rises above the wall)
	b.box(1.1, 0.12, 0.55, Pal.STONE_LIGHT, 0, 4.2, -0.12)
	for i in 3:
		b.cyl(0.06, 0.06, 0.7, Pal.OAK_DARK, -0.12 + i * 0.12, 0.3 + (i % 2) * 0.1 - 0.35, -0.05, 6, {},
			Vector3(0, 0.25 * (i - 1), PI / 2))
	var f1 := b.dynamic_cone(0.2, 0.55, Builder.glow_material(Pal.FIRE, 0xff9a2e, 1.6), 0, 0.62, -0.05)
	var f2 := b.dynamic_cone(0.11, 0.35, Builder.glow_material(0xffe08a, 0xffd36b, 1.6), 0.1, 0.55, 0)
	b.reg.flames.append(f1); b.reg.flames.append(f2)
	b.light(0xff9440, 9.0, 0, 0.8, 0.5, "fire_lights")
	b.cyl(0.012, 0.012, 0.5, Pal.IRON, 0, 0.78, -0.05, 4)      # cauldron on chain
	b.ball(0.2, Pal.IRON, 0, 0.62, -0.05, 1, 0.8)
	b.box(0.5, 0.03, 0.03, Pal.IRON, 0, 1.18, -0.05)


static func tub(b: Builder) -> void:
	b.cyl(0.5, 0.45, 0.55, Pal.OAK, 0, 0, 0, 14)
	for y in [0.1, 0.4]:
		b.cyl(0.52, 0.52, 0.035, Pal.IRON, 0, y, 0, 14)
	b.torus(0.47, 0.035, Pal.OAK_LIGHT, 0, 0.56, 0, 16, 6)
	b.cyl(0.45, 0.45, 0.01, Pal.WATER, 0, 0.55, 0, 14, {"opacity": 0.8, "roughness": 0.2, "emissive": 0x335566, "emissive_intensity": 0.2})
	# folding screen behind the tub (away from the camera) with a towel over it
	b.box(1.4, 1.5, 0.05, Pal.OAK_DARK, 0.0, 0, -0.66); b.box(1.26, 1.2, 0.03, Pal.LINEN, 0.0, 0.15, -0.63)
	b.box(0.2, 0.5, 0.09, Pal.WOOL, 0.3, 0.95, -0.66)
	b.cyl(0.12, 0.1, 0.22, Pal.OAK_LIGHT, -0.6, 0, 0.45, 8)    # bucket


static func washstand(b: Builder) -> void:
	b.box(0.7, 0.06, 0.5, Pal.OAK, 0, 0.8, 0)
	for sx in [-1.0, 1.0]:
		for sz in [-1.0, 1.0]:
			b.box(0.06, 0.8, 0.06, Pal.OAK_DARK, sx * 0.29, 0, sz * 0.19)
	b.box(0.6, 0.04, 0.4, Pal.OAK_DARK, 0, 0.3, 0)
	b.cyl(0.2, 0.12, 0.1, Pal.CREAM, -0.05, 0.86, 0, 14)
	b.cyl(0.17, 0.17, 0.01, Pal.WATER, -0.05, 0.95, 0, 14, {"opacity": 0.8})
	b.cyl(0.08, 0.1, 0.22, Pal.CLAY, 0.24, 0.86, 0.05, 9)      # jug
	b.box(0.04, 0.12, 0.04, Pal.CLAY, 0.33, 0.95, 0.05)
	b.box(0.5, 0.45, 0.04, Pal.IRON_LIGHT, 0, 0.96, -0.26, 0.0, Vector3.ZERO, {"metalness": 0.3, "roughness": 0.4})  # plate mirror


static func settle(b: Builder) -> void:
	b.box(2.0, 0.42, 0.7, Pal.OAK, 0, 0, 0)
	b.box(2.05, 0.95, 0.1, Pal.OAK_LIGHT, 0, 0.1, -0.3)
	for sx in [-1.0, 1.0]:
		b.box(0.1, 0.72, 0.7, Pal.OAK_DARK, sx * 0.97, 0, 0)
	b.box(0.9, 0.09, 0.55, Pal.WOOL, -0.48, 0.42, 0.02); b.box(0.9, 0.09, 0.55, Pal.WOOL, 0.48, 0.42, 0.02)
	b.box(0.4, 0.34, 0.1, Pal.WOOL_BLUE, 0.62, 0.52, -0.2, 0.0, Vector3(-0.25, 0, 0))
	b.box(0.4, 0.34, 0.1, Pal.WOOL_OCHRE, -0.62, 0.52, -0.2, 0.0, Vector3(-0.25, 0, 0))


static func harp(b: Builder) -> void:
	b.box(0.78, 0.06, 0.4, Pal.OAK_DARK, 0, 0, 0)
	b.box(0.1, 1.25, 0.14, Pal.OAK, 0.3, 0.06, 0)              # pillar
	b.box(0.14, 1.1, 0.22, Pal.OAK_LIGHT, -0.3, 0.06, 0)       # sound box
	b.box(0.78, 0.09, 0.1, Pal.OAK, 0, 1.31 - 0.045, 0, 0.0, Vector3(0, 0, -0.12))  # neck
	for i in 7:
		var t := i / 6.0
		var x := -0.23 + t * 0.46
		var top := 1.31 + (0.25 - x) * 0.12
		var bottom := 0.25 + (1.0 - t) * 0.12
		b.cyl(0.006, 0.006, top - bottom - 0.05, Pal.GOLD, x, bottom, 0, 4)
	b.ball(0.05, Pal.GOLD, 0.3, 1.33, 0, 0)


static func table(b: Builder) -> void:
	b.box(1.5, 0.08, 0.9, Pal.OAK_LIGHT, 0, 0.7, 0)
	for sx in [-1.0, 1.0]:
		b.box(0.09, 0.7, 0.7, Pal.OAK_DARK, sx * 0.55, 0, 0)
	b.box(1.0, 0.07, 0.07, Pal.OAK_DARK, 0, 0.2, 0)
	b.box(1.52, 0.012, 0.012, Pal.OAK_DARK, 0, 0.77, 0.1)
	b.cyl(0.17, 0.12, 0.05, Pal.OAK, -0.4, 0.78, 0.1, 10)      # bowl
	b.ball(0.13, 0xd9a86a, 0.05, 0.84, 0.15, 1, 0.65)          # bread
	b.cyl(0.07, 0.09, 0.2, Pal.CLAY, 0.45, 0.78, -0.1, 9)      # jug
	b.cyl(0.03, 0.03, 0.14, Pal.CREAM, -0.1, 0.78, -0.2, 6)    # candle
	b.cyl(0.0, 0.025, 0.07, Pal.FIRE, -0.1, 0.96 - 0.035, -0.2, 5, FLAME)


static func stool(b: Builder) -> void:
	b.cyl(0.21, 0.21, 0.06, Pal.OAK_LIGHT, 0, 0.42, 0, 10)
	for i in 3:
		var a := i * 2.09
		b.cyl(0.03, 0.025, 0.42, Pal.OAK_DARK, cos(a) * 0.14, 0, sin(a) * 0.14, 5)


static func plant(b: Builder) -> void:
	b.cyl(0.22, 0.16, 0.34, Pal.CLAY, 0, 0, 0, 9)
	b.ball(0.34, Pal.LEAF, 0, 0.7, 0, 1, 1.15)
	b.ball(0.22, Pal.LEAF_LIGHT, 0.15, 0.98, 0.05, 1, 1.1)
	b.ball(0.2, Pal.LEAF_DARK, -0.16, 0.88, -0.08, 1)


static func candlestand(b: Builder) -> void:
	for i in 3:
		var a := i * 2.09
		b.cyl(0.02, 0.02, 0.35, Pal.IRON, cos(a) * 0.12, 0, sin(a) * 0.12, 5, {}, Vector3(-sin(a) * 0.35, 0, cos(a) * 0.35))
	b.cyl(0.025, 0.025, 1.4, Pal.IRON, 0, 0.1, 0, 6)
	b.cyl(0.2, 0.2, 0.03, Pal.IRON, 0, 1.5, 0, 10)
	for i in 3:
		var a := i * 2.09
		var x := cos(a) * 0.12
		var z := sin(a) * 0.12
		b.cyl(0.03, 0.03, 0.2, Pal.CREAM, x, 1.53, z, 6)
		var f := b.dynamic_cone(0.03, 0.09, Builder.glow_material(Pal.FIRE, 0xff9a2e, 0.0), x, 1.78, z)
		b.reg.lamp_shades.append(f)
	b.light(0xffc880, 7.0, 0, 1.8, 0, "lamp_lights")


static func bookshelf(b: Builder) -> void:
	b.box(1.1, 1.9, 0.35, Pal.OAK_DARK, 0, 0, 0)
	var cols := [Pal.WOOL, Pal.WOOL_BLUE, Pal.WOOL_GREEN, Pal.WOOL_OCHRE, Pal.LEATHER]
	for s in 4:
		b.box(1.02, 0.04, 0.33, Pal.OAK, 0, 0.35 + s * 0.45, 0.01)
		for i in 6:
			var h := 0.22 + ((i * 7 + s * 3) % 5) * 0.03
			b.box(0.07, h, 0.22, cols[(i + s) % cols.size()], -0.4 + i * 0.12, 0.39 + s * 0.45, 0.02)
	b.cyl(0.04, 0.04, 0.3, Pal.CREAM, 0.35, 1.82 - 0.15, 0.05, 8, {}, Vector3(0, 0, PI / 2))


static func rug(b: Builder) -> void:
	var prev := b.shadow
	b.shadow = false
	b.cyl(1.2, 1.2, 0.025, Pal.WOOL, 0, 0, 0, 24)
	b.cyl(1.0, 1.0, 0.03, Pal.WOOL_OCHRE, 0, 0, 0, 24)
	b.cyl(0.8, 0.8, 0.035, Pal.WOOL_BLUE, 0, 0, 0, 24)
	b.cyl(0.45, 0.45, 0.04, Pal.WOOL, 0, 0, 0, 24)
	b.shadow = prev


static func banner(b: Builder) -> void:
	b.box(0.95, 0.05, 0.06, Pal.OAK_DARK, 0, 1.1, 0)
	b.box(0.78, 1.0, 0.02, Pal.WOOL, 0, 0.12, 0.02)
	b.box(0.55, 0.55, 0.02, Pal.WOOL, 0, 0.17 - 0.275, 0.02, 0.0, Vector3(0, 0, PI / 4))
	b.box(0.26, 0.26, 0.025, Pal.GOLD, 0, 0.5, 0.035, 0.0, Vector3(0, 0, PI / 4))
	for sx in [-1.0, 1.0]:
		b.ball(0.04, Pal.GOLD, sx * 0.5, 1.13, 0, 0)


static func chest(b: Builder) -> void:
	b.box(1.0, 0.4, 0.55, Pal.OAK, 0, 0, 0)
	b.cyl(0.275, 0.275, 1.0, Pal.OAK_LIGHT, 0, -0.1, 0, 10, {}, Vector3(0, 0, PI / 2), 0.0, PI)  # arched lid
	for x in [-0.35, 0.35]:
		b.box(0.07, 0.42, 0.57, Pal.IRON, x, 0, 0)
	b.box(0.1, 0.12, 0.04, Pal.GOLD, 0, 0.28, 0.29)


static func barrel(b: Builder) -> void:
	b.cyl(0.3, 0.27, 0.8, Pal.OAK, 0, 0, 0, 10)
	b.cyl(0.34, 0.31, 0.06, Pal.IRON, 0, 0.14, 0, 10); b.cyl(0.34, 0.31, 0.06, Pal.IRON, 0, 0.6, 0, 10)
	b.cyl(0.28, 0.28, 0.02, Pal.OAK_LIGHT, 0, 0.8, 0, 10)


# ---- scenery ----------------------------------------------------------------
static func tree(b: Builder) -> void:
	b.cyl(0.14, 0.2, 0.9, Pal.OAK_DARK, 0, 0, 0, 6)
	b.ball(0.78, Pal.LEAF_DARK, 0, 1.5, 0, 1, 1.1)
	b.ball(0.5, Pal.LEAF, 0.2, 2.1, 0.1, 1, 1.1)


static func pine(b: Builder) -> void:
	b.cyl(0.1, 0.14, 0.6, Pal.OAK_DARK, 0, 0, 0, 6)
	for i in 3:
		b.cyl(0.05, 0.7 - i * 0.18, 0.8, 0x4f8f66 if i % 2 == 1 else 0x5ba06b, 0, 0.5 + i * 0.5, 0, 7)


static func bush(b: Builder) -> void:
	b.ball(0.4, Pal.LEAF, 0, 0.3, 0, 1, 0.8)
	b.ball(0.3, Pal.LEAF_DARK, 0.3, 0.25, 0.1, 1, 0.8)


static func flowers(b: Builder) -> void:
	var cols := [Pal.WOOL, Pal.WOOL_OCHRE, 0xd98fb0, 0xffffff]
	for i in 5:
		var a := i * 2.4
		var r := 0.12 + (i % 3) * 0.08
		b.cyl(0.01, 0.01, 0.18, Pal.LEAF, cos(a) * r, 0, sin(a) * r, 4)
		b.ball(0.055, cols[i % 4], cos(a) * r, 0.2, sin(a) * r, 0)


static func well(b: Builder) -> void:
	b.cyl(0.55, 0.6, 0.65, Pal.STONE, 0, 0, 0, 10)
	b.cyl(0.4, 0.4, 0.02, 0x2d4452, 0, 0.64, 0, 10)
	for sx in [-1.0, 1.0]:
		b.box(0.08, 1.35, 0.08, Pal.OAK_DARK, sx * 0.5, 0.6, 0)
	b.cyl(0.0, 0.9, 0.55, Pal.THATCH, 0, 2.2 - 0.275, 0, 4, {}, Vector3(0, PI / 4, 0))
	b.cyl(0.12, 0.1, 0.16, Pal.OAK, 0, 1.5 - 0.08, 0, 7, {}, Vector3(0, 0, PI / 2))


static func haystack(b: Builder) -> void:
	b.cyl(0.55, 0.65, 0.6, Pal.THATCH, 0, 0, 0, 9)
	b.cyl(0.0, 0.6, 0.6, 0xe3c46c, 0, 0.9 - 0.3, 0, 9)


static func veg_patch(b: Builder) -> void:
	b.box(2.2, 0.12, 1.4, Pal.SOIL_DARK, 0, 0, 0)
	var cols := [Pal.LEAF_LIGHT, Pal.LEAF, Pal.WOOL_OCHRE]
	for r in 3:
		for i in 5:
			b.ball(0.11, cols[r], -0.85 + i * 0.42, 0.22, -0.4 + r * 0.4, 1, 0.8)


static func lantern(b: Builder) -> void:
	b.cyl(0.05, 0.07, 1.7, Pal.OAK_DARK, 0, 0, 0, 6)
	b.box(0.6, 0.06, 0.06, Pal.OAK, 0.25, 1.62, 0)
	b.cyl(0.008, 0.008, 0.18, Pal.IRON, 0.5, 1.44, 0, 4)
	b.box(0.2, 0.04, 0.2, Pal.IRON, 0.5, 1.4, 0); b.box(0.2, 0.04, 0.2, Pal.IRON, 0.5, 1.66 - 0.2, 0)
	var glow := b.dynamic_box(0.14, 0.2, 0.14, Builder.glow_material(Pal.FIRE, 0xff9a2e, 0.0), 0.5, 1.2, 0)
	b.reg.lamp_shades.append(glow)
	for sx in [-1.0, 1.0]:
		for sz in [-1.0, 1.0]:
			b.box(0.025, 0.24, 0.025, Pal.IRON, 0.5 + sx * 0.085, 1.18, sz * 0.085)
	b.light(0xffb866, 8.0, 0.5, 1.3, 0, "lamp_lights")
