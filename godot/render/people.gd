class_name People
extends RefCounted
## Rayman-style bodies: a shaped, painted garment (one smooth lathe shell with vertex-colour trims), floating sphere
## hands, no arms/legs/neck; the head sinks into a rolled collar and the hem hovers just above the ground.
## Ported from buildRay() in src/render/people.js. Every builder returns {root, pivot, parts}; parts are named pivots
## (legL, legR, armL, armR, body, head, optional tail) so the animation layer works for any body.

const GARMENT := {   # [radius, y] profiles (top -> hem); lathe, scaled by build and squashed front-to-back
	"short": [[0, 1.03], [0.1, 1.0], [0.19, 0.93], [0.235, 0.78], [0.225, 0.58], [0.25, 0.4], [0.275, 0.2], [0.28, 0.12], [0, 0.1]],
	"bell": [[0, 1.03], [0.1, 1.0], [0.19, 0.93], [0.23, 0.78], [0.22, 0.6], [0.28, 0.38], [0.34, 0.18], [0.35, 0.12], [0, 0.1]],
	"long": [[0, 1.03], [0.1, 1.0], [0.19, 0.93], [0.24, 0.78], [0.235, 0.6], [0.29, 0.4], [0.35, 0.2], [0.36, 0.12], [0, 0.1]],
}
# Rolled collar that grows out of the shoulders and wraps the neck
const COLLAR := [[0.17, 0.95], [0.15, 0.98], [0.12, 1.008], [0.095, 1.03], [0.075, 1.045], [0.06, 1.047], [0.05, 1.035], [0.05, 0.98]]

static var _garment_mat: StandardMaterial3D
static var _collar_mesh: ArrayMesh
static var _garment_cache: Dictionary = {}


static func _gmat() -> StandardMaterial3D:
	if _garment_mat == null:
		_garment_mat = StandardMaterial3D.new()
		_garment_mat.vertex_color_use_as_albedo = true
		_garment_mat.vertex_color_is_srgb = false
		_garment_mat.roughness = 0.9
	return _garment_mat


static func _band(v: float, a: float, b: float, e: float = 0.012) -> float:
	return Geo.ss(v, a - e, a + e) * (1.0 - Geo.ss(v, b - e, b + e))


static func _paint(L: Dictionary, K: Dictionary, y: float, a: float, th: float) -> Color:
	var outfit: String = L.outfit
	var c: Color = K.cream if outfit == "jerkin" else (K.steel if outfit == "knight" else K.shirt)
	var mix := func(cc: Color, k: String, w: float) -> Color:
		return cc.lerp(K[k], w) if w > 0.001 else cc
	if L.get("cloak") != null:   # cloak: a strip down the back
		c = mix.call(c, "cloak", _band(y, 0.12, 0.99) * Geo.ss(a, 1.85, 2.25))
	var hem := _band(y, 0.1, 0.19)
	var apron: bool = L.get("apron", true)
	if outfit == "gown" or outfit == "dress":
		if apron or outfit == "dress":
			c = mix.call(c, "cream", _band(y, 0.19, 0.55) * (1.0 - Geo.ss(a, 0.5, 0.58)))
			c = mix.call(c, "cream", _band(y, 0.55, 0.88) * (1.0 - Geo.ss(a, 0.28, 0.34)))
		c = mix.call(c, "cream", hem)
		c = mix.call(c, "ochre" if outfit == "gown" else "leather", _band(y, 0.55, 0.61))
	elif outfit == "robe":
		c = mix.call(c, "cream", _band(y, 0.19, 0.93) * (1.0 - Geo.ss(a, 0.08, 0.12)))
		c = mix.call(c, "cream", hem)
		c = mix.call(c, "cream", _band(y, 0.55, 0.6))
	elif outfit == "noble":
		c = mix.call(c, "trim", _band(y, 0.19, 0.93) * (1.0 - Geo.ss(a, 0.15, 0.19)))
		c = mix.call(c, "trim", hem)
		c = mix.call(c, "gold", _band(y, 0.52, 0.58))
	elif outfit == "smith":
		c = mix.call(c, "leather", _band(y, 0.19, 0.62) * (1.0 - Geo.ss(a, 0.6, 0.68)))
		c = mix.call(c, "leather", _band(y, 0.62, 0.9) * (1.0 - Geo.ss(a, 0.34, 0.4)))
		c = mix.call(c, "leather", _band(y, 0.5, 0.56))
	elif outfit == "jerkin":
		c = mix.call(c, "trim", _band(y, 0.42, 0.94) * Geo.ss(a, 0.26, 0.32))
		c = mix.call(c, "leather", _band(y, 0.53, 0.58))
	elif outfit == "knight":   # plate armour with a heraldic tabard, gorget, pauldron edges and a hem skirt
		c = mix.call(c, "steelD", _band(y, 0.1, 0.2))
		c = mix.call(c, "steelD", _band(y, 0.86, 1.05))
		c = mix.call(c, "trim", _band(y, 0.2, 0.86) * (1.0 - Geo.ss(a, 0.5, 0.58)))
		c = mix.call(c, "cream", _band(y, 0.3, 0.78) * (1.0 - Geo.ss(a, 0.05, 0.08)) + _band(y, 0.58, 0.66) * (1.0 - Geo.ss(a, 0.2, 0.24)))
		c = mix.call(c, "leather", _band(y, 0.5, 0.56))
		c = mix.call(c, "gold", _band(y, 0.5, 0.56) * (1.0 - Geo.ss(a, 0.08, 0.12)))
		c = mix.call(c, "steelD", _band(y, 0.7, 0.9) * _band(a, 1.2, 1.95, 0.06))
		c = mix.call(c, "gold", _band(y, 0.7, 0.73) * _band(a, 1.2, 1.95, 0.06))
	elif outfit == "adventurer":   # leather vest over a shirt, bandolier, belt, scarf
		c = mix.call(c, "brown", _band(y, 0.38, 0.94) * Geo.ss(a, 0.2, 0.26))
		c = mix.call(c, "leather", _band(y, 0.5, 0.56))
		c = mix.call(c, "brown", _band(y, 0.1, 0.17))
		c = mix.call(c, "leather", _band(y + 0.2 * th, 0.58, 0.68) * (1.0 - Geo.ss(a, 1.3, 1.5)))
		c = mix.call(c, "gold", _band(y + 0.2 * th, 0.62, 0.64) * (1.0 - Geo.ss(a, 1.3, 1.5)) * 0.8)
	elif outfit == "ranger":   # forest tunic with a cross harness and a patterned hem
		c = mix.call(c, "brown", _band(y, 0.1, 0.18))
		c = mix.call(c, "leather", _band(y, 0.5, 0.56))
		c = mix.call(c, "leather", _band(y + 0.18 * th, 0.6, 0.67) * (1.0 - Geo.ss(a, 1.3, 1.5)) + _band(y - 0.18 * th, 0.6, 0.67) * (1.0 - Geo.ss(a, 1.3, 1.5)))
		c = mix.call(c, "gold", _band(y, 0.5, 0.56) * (1.0 - Geo.ss(a, 0.08, 0.12)))
	else:   # tunic
		c = mix.call(c, "cream", hem)
		c = mix.call(c, "leather", _band(y, 0.52, 0.58))
		c = mix.call(c, "gold", _band(y, 0.52, 0.58) * (1.0 - Geo.ss(a, 0.1, 0.15)))
	return c


static func _garment_mesh(L: Dictionary, key: String, K: Dictionary) -> ArrayMesh:
	var ck := JSON.stringify([key, L.outfit, L.shirt, L.get("trim"), L.get("cloak"), L.get("apron")])
	if _garment_cache.has(ck):
		return _garment_cache[ck]
	var pts: Array = []
	for p in GARMENT[key]:
		pts.append(Vector2(p[0], p[1]))
	var crv := Geo.spline2(pts, 64)
	crv.reverse()   # bottom -> top for outward faces
	var mesh := Geo.lathe(crv, 56, func(_j: int, y: float, th: float) -> Color: return _paint(L, K, y, absf(th), th))
	_garment_cache[ck] = mesh
	return mesh


static func _collar_mesh_get() -> ArrayMesh:
	if _collar_mesh == null:
		var pts: Array = []
		for p in COLLAR:
			pts.append(Vector2(p[0], p[1]))
		_collar_mesh = Geo.lathe(Geo.spline2(pts, 24), 28)
	return _collar_mesh


static func _lin(h: int) -> Color:
	return Geo.hex_to_lin(h)


static func build_ray(cfg: Dictionary) -> Dictionary:
	var L := Face.merged_look(cfg.look)
	var scale_v: float = cfg.get("scale", 1.0)
	var head_scale: float = cfg.get("headScale", 1.0)
	var skin: int = L.skin
	var shirt: int = L.shirt
	var outfit: String = L.outfit
	var g: float = L.build
	var trim: int = L.trim if L.get("trim") != null else Pal.GOLD
	var outer := Node3D.new()
	var pivot := Node3D.new()
	pivot.scale = Vector3.ONE * scale_v
	outer.add_child(pivot)
	var parts := {"legL": Node3D.new(), "legR": Node3D.new()}   # legs are not drawn; kept so the animation layer still works
	parts.legL.position = Vector3(-0.1, 0.5, 0)
	parts.legR.position = Vector3(0.1, 0.5, 0)
	pivot.add_child(parts.legL)
	pivot.add_child(parts.legR)
	var body := Node3D.new()
	pivot.add_child(body)
	parts.body = body
	var K := {"shirt": _lin(shirt), "cream": _lin(Pal.CREAM), "leather": _lin(Pal.LEATHER), "gold": _lin(Pal.GOLD),
		"trim": _lin(trim), "steel": _lin(0xa9b2bf), "steelD": _lin(0x6f7886), "steelL": _lin(0xd2d9e2), "brown": _lin(0x6e4a30),
		"ochre": _lin(Pal.WOOL_OCHRE), "cloak": _lin(L.cloak if L.get("cloak") != null else 0)}
	var key := "short"
	if outfit == "gown" or outfit == "dress":
		key = "bell"
	elif outfit == "robe" or outfit == "noble":
		key = "long"
	var gm := MeshInstance3D.new()
	gm.mesh = _garment_mesh(L, key, K)
	gm.material_override = _gmat()
	gm.scale = Vector3(g, 1.0, 0.82)
	body.add_child(gm)
	var collar_c := Pal.CREAM
	match outfit:
		"knight": collar_c = 0x6f7886
		"adventurer": collar_c = trim
		"ranger": collar_c = 0x6e4a30
		"robe": collar_c = Geo.tint(shirt, -0.2)
		"noble": collar_c = trim
		"smith": collar_c = shirt
	var cm := MeshInstance3D.new()
	cm.mesh = _collar_mesh_get()
	cm.material_override = Prim.smooth_mat(collar_c)
	cm.scale = Vector3(g * 1.2, 1.0, 0.7 * 1.2)
	cm.position.y = -0.02
	body.add_child(cm)

	for pair in [["armL", -1.0], ["armR", 1.0]]:   # floating sphere hands (the arm group is just the swing pivot)
		var sx: float = pair[1]
		var arm := Node3D.new()
		arm.position = Vector3(sx * 0.3 * g, 0.82, 0)
		arm.rotation.z = sx * 0.08
		body.add_child(arm)
		Prim.ball(arm, 0.08, skin, sx * 0.07, -0.34, 0.03, 1.0, 1.0, 1.0, 12)
		parts[pair[0]] = arm
	var hs := head_scale * 1.1
	var hy := 1.14 + (Face.head_bottom(L) - 0.2) * 0.8
	var head := Node3D.new()
	head.position = Vector3(0, hy, 0)
	head.scale = Vector3.ONE * hs
	body.add_child(head)
	Face.build(head, L)
	Hair.build(head, L)
	_build_headwear(head, L)
	parts.head = head
	return {"root": outer, "pivot": pivot, "parts": parts}


static func _build_headwear(head: Node3D, L: Dictionary) -> void:
	if L.get("headwear") == "circlet":   # slim gold band with a gem
		var b := Prim.torus(head, 0.205, 0.014, Pal.GOLD, 0, 0.1, 0)
		b.rotation.x = PI / 2.0
		b.scale = Vector3(L.headW, 1, 1)
		Prim.ball(head, 0.03, 0x4fb0e0, 0, 0.1, 0.21)
		return
	Headwear.build(head, L)


static func build_person(cfg: Dictionary) -> Dictionary:
	return build_ray(cfg)
