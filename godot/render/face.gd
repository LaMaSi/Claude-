class_name Face
extends RefCounted
## Soft, round heads with a PAINTED face (Mii-style): a smooth deformed sphere plus a texture holding the eyes, brows,
## mouth, blush and freckles. Ported from src/render/face.js (textures are painted by FacePaint via FaceBaker).

const HEAD_R := 0.2
const TEX_W := 512
const TEX_H := 320

# shape: oval | round | long | heart | pear | square | chubby (legacy: soft = chubby, pointy = heart).
const SHAPES := {
	"oval": {"low": 0.14, "lowPow": 1.5, "up": 0.0, "chinY": 0.06},
	"round": {"low": 0.05, "lowPow": 2.0, "up": 0.0, "chinY": 0.0},
	"long": {"low": 0.2, "lowPow": 1.3, "up": 0.0, "chinY": 0.1},
	"heart": {"low": 0.4, "lowPow": 1.3, "up": 0.07, "chinY": 0.1, "zLow": 0.2},
	"pear": {"low": -0.1, "lowPow": 0.9, "up": -0.1, "chinY": 0.0, "zLow": 0.0},
	"square": {"low": -0.1, "lowPow": 0.7, "up": 0.0, "chinY": -0.1, "flat": 0.84, "zLow": -0.04},
	"chubby": {"low": -0.07, "lowPow": 0.9, "up": 0.0, "chinY": 0.0, "cheek": 0.1},
}
const ALIAS := {"soft": "chubby", "pointy": "heart"}
# Expressions override a few painted features. 'blink' only closes the eyes; mood expressions also change brows and mouth.
const EXPRESSIONS := {
	"neutral": {}, "blink": {"eyes": "closed"},
	"happy": {"eyes": "happy", "mouth": "grin", "blush": true}, "content": {"eyes": "happy", "mouth": "smile"},
	"sad": {"eyes": "sleepy", "brows": "worried", "mouth": "frown"}, "worried": {"brows": "worried", "mouth": "o"},
	"sleep": {"eyes": "closed", "brows": "none", "mouth": "tiny"}, "surprised": {"eyes": "big", "brows": "arched", "mouth": "o"},
	"angry": {"brows": "angry", "mouth": "frown", "eyes": "narrow"}, "talk": {"mouth": "open"}, "tired": {"eyes": "sleepy", "mouth": "flat"},
}
const DEFAULT_LOOK := {
	"skin": 0xf2c4a0, "hair": 0x5b3a29, "hairStyle": "short", "headwear": null, "headwearColor": 0xf0e8d4,
	"headW": 1.0, "headH": 1.0, "jaw": "round", "ears": "round",
	"eyes": "dot", "eyeColor": 0x4a3a2c, "eyeGap": 0.07, "eyeY": 0.0, "eyeSize": 1.0,
	"brows": "thin", "browColor": null, "nose": "button", "mouth": "smile", "blush": true, "freckles": 0,
	"facial": "none", "accessories": [],
	"outfit": "tunic", "shirt": 0x4f7a9c, "pants": 0x6b5a48, "trim": 0xe0b24a, "apron": true, "build": 1.0, "cloak": null,
}

static var _geo_cache: Dictionary = {}
static var _mat_cache: Dictionary = {}
static var baker: FaceBaker


static func merged_look(look: Dictionary) -> Dictionary:
	var L := DEFAULT_LOOK.duplicate(true)
	for k in look:
		L[k] = look[k]
	if look.get("beard") and not look.get("facial"):
		L.facial = "full"
	return L


static func _shape_of(L: Dictionary) -> String:
	var j: String = L.jaw
	if SHAPES.has(j):
		return j
	return ALIAS.get(j, "oval")


## Lowest point of the chin (head units, before headScale): lets the body keep the chin clear of the collar.
static func head_bottom(L: Dictionary) -> float:
	var S: Dictionary = SHAPES[_shape_of(L)]
	return HEAD_R * float(L.headH) * (S.flat if S.has("flat") else 1.0 + float(S.chinY))


static func head_mesh(L: Dictionary) -> ArrayMesh:
	var shape := _shape_of(L)
	var S: Dictionary = SHAPES[shape]
	var chin: float = L.get("chin", 0.0)
	var cheek: float = float(L.get("cheek", 0.0)) + float(S.get("cheek", 0.0))
	var brow: float = L.get("brow", 0.0)
	var hw: float = L.headW
	var hh: float = L.headH
	var key := "%s|%s|%s|%s|%s|%s" % [hw, hh, shape, chin, cheek, brow]
	if _geo_cache.has(key):
		return _geo_cache[key]
	var R := HEAD_R
	var WS := 32
	var HS := 24
	var pos := PackedVector3Array()
	var nrm := PackedVector3Array()
	var uvs := PackedVector2Array()
	var low: float = S.low
	var low_pow: float = S.lowPow
	var up_k: float = S.up
	var chin_y: float = S.chinY
	var z_low: float = S.get("zLow", 0.08)
	var flat: float = S.get("flat", 0.0)
	for iy in HS + 1:
		var v := float(iy) / HS
		for ix in WS + 1:
			var u := float(ix) / WS
			var x := -R * cos(u * TAU) * sin(v * PI)
			var y := R * cos(v * PI)
			var z := R * sin(u * TAU) * sin(v * PI)
			var ny := y / R
			var t := maxf(0.0, -ny)
			var uu := maxf(0.0, ny)
			var front := maxf(0.0, z / R)
			var xs := 1.0
			var zs := 1.0
			var ys := 1.0
			xs -= low * pow(t, low_pow)
			xs += up_k * uu                                                     # jaw taper / forehead width
			zs -= z_low * pow(t, 1.5) * 0.6
			ys += chin_y * t                                                    # longer chin
			xs += cheek * sin(minf(1.0, t * 1.6) * PI) * 0.9                    # cheek fullness around mid-lower face
			if uu > 0.0:
				xs *= 1.0 - 0.05 * uu                                           # egg: crown a touch narrower
			var nx2 := x * xs * hw
			var ny2 := y * ys * hh
			var nz2 := z * zs
			if flat > 0.0 and ny2 < -R * flat * hh:
				ny2 = -R * flat * hh + (ny2 + R * flat * hh) * 0.15             # flat jaw line
			nz2 += chin * 0.055 * Geo.ss(t, 0.35, 1.0) * front                  # chin juts forward / recedes
			nz2 += brow * 0.04 * Geo.ss(uu, 0.15, 0.7) * (1.0 - Geo.ss(uu, 0.7, 1.0)) * front   # brow ridge
			pos.append(Vector3(nx2, ny2, nz2))
			var gn := Vector3(x / R / hw, y / R / hh, z / R)
			nrm.append(gn.normalized() if gn.length() > 0.0 else Vector3.UP)
			# the face only occupies the front half of the head: that half uses the whole texture width
			uvs.append(Vector2(clampf(2.0 * u, 0.0, 1.0), v))
	var idx := PackedInt32Array()
	for iy in HS:
		for ix in WS:
			var a := iy * (WS + 1) + ix + 1
			var b := iy * (WS + 1) + ix
			var c := (iy + 1) * (WS + 1) + ix
			var d := (iy + 1) * (WS + 1) + ix + 1
			if iy != 0:
				idx.append(a); idx.append(b); idx.append(d)
			if iy != HS - 1:
				idx.append(b); idx.append(c); idx.append(d)
	var m := Geo.build(pos, idx, PackedColorArray(), null, [], uvs, nrm)
	_geo_cache[key] = m
	return m


static func effective_look(L0: Dictionary, expr: String) -> Dictionary:
	if EXPRESSIONS.has(expr) and expr != "neutral":
		var L := L0.duplicate()
		L.merge(EXPRESSIONS[expr], true)
		return L
	return L0


## Face material for a look + expression. Returns immediately (flat skin colour); the painted texture is baked
## asynchronously by `baker` and swapped in when ready.
static func head_material(L0: Dictionary, expr: String = "neutral") -> StandardMaterial3D:
	var L := effective_look(L0, expr)
	var key := JSON.stringify([expr, L.eyes, L.skin, L.headW, L.headH, L.eyeColor, L.eyeGap, L.eyeY, L.eyeSize, L.brows,
		L.browColor if L.get("browColor") != null else L.hair, L.nose, L.mouth, L.get("eyeTilt", 0.0), L.blush, L.freckles,
		L.accessories.has("eyepatch"), L.accessories.has("scar")])
	if not _mat_cache.has(key):
		var m := StandardMaterial3D.new()
		m.albedo_color = GameData.col(L.skin)
		m.roughness = 0.85
		m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
		m.disable_receive_shadows = true   # the face never receives shadows: a nose must not cast a frown
		_mat_cache[key] = m
		if baker != null:
			baker.request(L, m)
	return _mat_cache[key]


static func z_at(L: Dictionary) -> Callable:
	var hw: float = L.headW
	var hh: float = L.headH
	return func(x: float, y: float) -> float:
		return sqrt(maxf(0.0004, HEAD_R * HEAD_R - (x / hw) * (x / hw) - (y / hh) * (y / hh)))


static func build(head: Node3D, L: Dictionary) -> void:
	var skin: int = L.skin
	var hw: float = L.headW
	var hh: float = L.headH
	var R := HEAD_R
	var zat := z_at(L)
	var put := func(m: Node3D, x: float, y: float, dz: float = 0.004) -> Node3D:
		m.position = Vector3(x, y, float(zat.call(x, y)) + dz)
		m.rotation.y = asin(clampf(x / (R * hw), -0.9, 0.9))
		return m
	var skull := MeshInstance3D.new()
	skull.mesh = head_mesh(L)
	skull.material_override = head_material(L, "neutral")
	head.add_child(skull)
	head.set_meta("skull", skull)   # so the animation layer can swap expressions
	head.set_meta("look", L)

	# ears: a flattened shell with a darker inner hollow, set just behind the centre line of the head
	var ears: String = L.get("ears", "round")
	if ears != "none":
		for s in [-1.0, 1.0]:
			var ear_c := Geo.tint(skin, -0.06)
			var inner := Geo.tint(skin, -0.22)
			var ex0: float = s * 0.196 * hw
			var big := 1.35 if ears == "big" else 1.0
			if ears == "pointy":
				var e := Prim.ell(head, 0.03, 0.09 * 1.7, 0.075, skin, ex0 + s * 0.02, 0.07, -0.02, 14)
				e.rotation.z = -s * 0.9
				var ei := Prim.ell(head, 0.012, 0.09, 0.04, inner, ex0 + s * 0.035, 0.07, -0.015, 10)
				ei.rotation.z = -s * 0.9
			else:
				Prim.ell(head, 0.03 * big, 0.105 * big, 0.08 * big, ear_c, ex0 + s * 0.012, 0.0, -0.025, 14).rotation.z = -s * 0.12
				Prim.ell(head, 0.012, 0.06 * big, 0.04 * big, inner, ex0 + s * 0.024, 0.0, -0.02, 10)
	var ex: float = L.eyeGap
	var ey: float = 0.02 + float(L.eyeY)
	# nose: soft ellipsoids (the 'button' nose also has painted shading in the face texture)
	var nz: float = float(zat.call(0.0, -0.04)) - 0.012
	var nc := Geo.tint(skin, -0.05)
	var nose := func(w: float, h: float, d: float, y: float, tilt: float = 0.0, tip: float = 0.0) -> void:
		var m := Prim.ell(head, w, h, d, nc, 0.0, y, nz + d * 0.3, 16)
		m.rotation.x = tilt
		m.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		if tip > 0.0:
			var t := Prim.ell(head, w * 0.9, tip, d * 0.8, nc, 0.0, y - h * 0.42, nz + d * 0.62, 14)
			t.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	match L.nose:
		"button": nose.call(0.05, 0.044, 0.046, -0.042)
		"big": nose.call(0.085, 0.07, 0.07, -0.046)
		"long": nose.call(0.05, 0.115, 0.06, -0.06, 0.12)
		"pointy": nose.call(0.04, 0.095, 0.07, -0.056, 0.3)
		"hook": nose.call(0.046, 0.08, 0.055, -0.052, 0.05, 0.04)
	FacialHair.build(head, L, zat)

	# accessories
	for a in L.get("accessories", []):
		if a == "glasses":
			for s in [-1.0, 1.0]:
				var r := Prim.torus(head, 0.048, 0.007, 0x6b5a48, 0, 0, 0)
				put.call(r, s * ex, ey, 0.02)
			var br := Prim.box(head, 0.03, 0.01, 0.01, 0x6b5a48, 0, 0, 0)
			put.call(br, 0.0, ey, 0.02)
			for s in [-1.0, 1.0]:
				Prim.box(head, 0.01, 0.01, 0.16, 0x6b5a48, s * 0.17 * hw, ey - 0.005, -0.04)
		if a == "eyepatch":
			var pad := Prim.ball(head, 0.055, 0x2a2428, 0, 0, 0, 1.0, 1.0, 0.4)
			put.call(pad, -ex, ey, 0.02)
			var band := Prim.torus(head, 0.205, 0.008, 0x2a2428, 0, ey + 0.045, 0)
			band.rotation.x = PI / 2.0 + 0.28
			band.scale = Vector3(hw, 1, 1)
		if a == "scar":
			var sc := Prim.box(head, 0.012, 0.1, 0.01, 0xc77a7a, 0, 0, 0)
			put.call(sc, 0.11, -0.03, 0.004)
			sc.rotation.z = 0.5
		if a == "earring":
			var er := Prim.torus(head, 0.022, 0.006, Pal.GOLD, 0.205 * hw, -0.06, 0.0)
			er.rotation.y = PI / 2.0
		if a == "headband":
			var hb := Prim.torus(head, 0.205, 0.016, L.trim, 0, 0.1, 0)
			hb.rotation.x = PI / 2.0
			hb.scale = Vector3(hw, 1, 1)
