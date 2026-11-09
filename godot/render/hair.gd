class_name Hair
extends RefCounted
## Hair as ONE continuous sculpted surface per style (no visible primitives), ported from src/render/hair.js.
## A "shell" wraps the skull: from the crown it follows the head, then (for longer hair) hangs down. Where it ends is a
## function of the azimuth around the head, so a single mesh carries the hairline, pointed lock tips, bangs and the
## nape. Shallow strand grooves + vertex-colour shading give it a sculpted, combed look.

const COVERS := ["coif", "hood", "kerchief", "bakerhat", "pointed", "strawhat", "flatcap", "helm"]

static var _mat: StandardMaterial3D
static var _spike_geo: Dictionary = {}


static func ss(x: float, a: float, b: float) -> float:
	return Geo.ss(x, a, b)


## Value that depends on |azimuth| (0 = front ... pi = back), cosine-smooth between key points.
static func prof(keys: Array) -> Callable:
	return func(az: float) -> float:
		var a := absf(az)
		for i in keys.size() - 1:
			var a0: float = keys[i][0]; var v0: float = keys[i][1]
			var a1: float = keys[i + 1][0]; var v1: float = keys[i + 1][1]
			if a <= a1:
				var d := a1 - a0
				var t := (a - a0) / (d if d != 0.0 else 1.0)
				return v0 + (v1 - v0) * (1.0 - cos(PI * clampf(t, 0.0, 1.0))) / 2.0
		return keys[keys.size() - 1][1]


## Pointed lock tips: 0..1, peaks (cusps) every 2*pi/f radians.
static func tips(az: float, f: float, ph: float = 0.0) -> float:
	return pow(1.0 - absf(sin(f * az / 2.0 + ph)), 1.3)


static func material() -> StandardMaterial3D:
	if _mat == null:
		_mat = StandardMaterial3D.new()
		_mat.vertex_color_use_as_albedo = true
		_mat.vertex_color_is_srgb = false  # colours are authored in linear space
		_mat.roughness = 0.82
		_mat.cull_mode = BaseMaterial3D.CULL_DISABLED
	return _mat


static func plain_material(color: int) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = GameData.col(color)
	m.roughness = 0.9
	return m


static func _grv(fn: Variant, az: float, u: float) -> float:
	if fn == null:
		return 0.0
	return (fn as Callable).call(az, u)


# ---- the shell ----------------------------------------------------------------------------------------------------
static func shell(o: Dictionary) -> ArrayMesh:
	var rx: float = o.rx; var ry: float = o.ry; var rz: float = o.rz
	var cy: float = o.get("cy", 0.0)
	var rows: int = o.get("rows", 24)
	var cols: int = o.get("cols", 60)
	var flare: float = o.get("flare", 0.0)
	var curl: float = o.get("curl", 0.0)
	var y_end: Callable = o.yEnd
	var thick: Callable = o.thick
	var groove: Variant = o.get("groove", null)
	var groove_amp: float = o.get("grooveAmp", 0.008)
	var el0v: Variant = o.get("el0", 0.0)
	var el0_is_fn: bool = el0v is Callable
	var el_eq := PI / 2.0 + 0.12
	var y_eq := cy + ry * cos(el_eq)
	var base := Geo.hex_to_lin(o.color)
	var W := cols + 1
	var pos := PackedVector3Array()
	var cols_arr := PackedColorArray()
	var idx := PackedInt32Array()
	# per-column values (they depend on azimuth only)
	var col_az: Array[float] = []
	var col_e0: Array[float] = []
	var col_ye: Array[float] = []
	for j in W:
		var az := (float(j) / cols) * TAU - PI
		col_az.append(az)
		col_e0.append((el0v as Callable).call(az) if el0_is_fn else float(el0v))
		col_ye.append(y_end.call(az))
	for i in rows + 1:
		var u := float(i) / rows
		for j in W:
			var az := col_az[j]
			var sa := sin(az); var ca := cos(az)
			var e0 := col_e0[j]
			var ye := col_ye[j]
			var el_end := acos(clampf((ye - cy) / ry, -1.0, 1.0)) if ye >= y_eq else el_eq
			var el_stop := maxf(el_end, e0 + 0.0001)
			var drop := y_eq - ye if ye < y_eq else 0.0
			var fd := 0.5 if drop > 0.0 else 1.0
			var t: float = thick.call(az, u)
			var gr := _grv(groove, az, u) * ss(u, 0.2, 0.75) if groove != null else 0.0
			var edge := 1.0 - ss(u, 0.86, 1.0)
			t = t * (0.2 + 0.8 * edge) * (pow(ss(u, 0.0, 0.85), 1.6) if e0 > 0.01 else 1.0) + 0.002
			if drop == 0.0 and el_end <= e0 + 0.03:
				t = -0.03  # no hair here (bald front of a tonsure etc.): sink the open edge into the skull
				gr = 0.0
			var p: Vector3
			if u <= fd:
				var el := e0 + (el_stop - e0) * (u / fd)
				var se := sin(el); var ce := cos(el)
				var nx := se * sa / (rx * rx); var ny := ce / (ry * ry); var nz := se * ca / (rz * rz)
				var nl := sqrt(nx * nx + ny * ny + nz * nz)
				if nl == 0.0:
					nl = 1.0
				var tt := t + gr
				p = Vector3(rx * se * sa + nx / nl * tt, cy + ry * ce + ny / nl * tt, rz * se * ca + nz / nl * tt)
			else:
				var d := (u - fd) / (1.0 - fd)
				var k := 1.0 + flare * d - curl * d * d
				var se := sin(el_eq)
				var nx := se * sa / (rx * rx); var nz := se * ca / (rz * rz)
				var nl := sqrt(nx * nx + nz * nz)
				if nl == 0.0:
					nl = 1.0
				nx /= nl; nz /= nl
				var tt := t + gr
				p = Vector3(rx * se * sa * k + nx * tt, y_eq - d * drop, rz * se * ca * k + nz * tt)
			pos.append(p)
			var sh := 1.0
			if groove != null:
				sh = 0.86 + 0.14 * clampf((gr / groove_amp) * 0.5 + 0.5, 0.0, 1.0) - 0.08 * u
			cols_arr.append(Color(base.r * sh, base.g * sh, base.b * sh))
	for i in rows:
		for j in cols:
			var a := i * W + j
			var b := a + 1
			var c := a + W
			var d2 := c + 1
			idx.append(a); idx.append(c); idx.append(b)
			idx.append(b); idx.append(c); idx.append(d2)
	# seam (back of the head) and pole normals, so lighting is continuous
	var merge: Array = []
	for i in rows + 1:
		merge.append(Vector2i(i * W, i * W + cols))
	var overrides := {}
	if not el0_is_fn and float(el0v) < 0.01:
		for j in W:
			overrides[j] = Vector3.UP
	return Geo.build(pos, idx, cols_arr, null, merge, PackedVector2Array(), PackedVector3Array(), overrides)


# ---- grooved blob (buns) ------------------------------------------------------------------------------------------
static func blob(r: float, color: int, sx: float = 1.0, sy: float = 1.0, sz: float = 1.0) -> ArrayMesh:
	var nu := 30
	var nv := 22
	var pos := PackedVector3Array()
	var cols := PackedColorArray()
	var idx := PackedInt32Array()
	var base := Geo.hex_to_lin(color)
	for iy in nv + 1:
		var v := float(iy) / nv
		for ix in nu + 1:
			var u := float(ix) / nu
			var x := -cos(u * TAU) * sin(v * PI)
			var y := cos(v * PI)
			var z := sin(u * TAU) * sin(v * PI)
			var th := atan2(z, x)
			var ph := acos(clampf(y, -1.0, 1.0))
			var w := sin(3.0 * th + 5.0 * ph)
			var k := r * (1.0 + 0.05 * w)
			pos.append(Vector3(x * k * sx, y * k * sy, z * k * sz))
			var sh := 0.9 + 0.1 * (0.5 + 0.5 * w)
			cols.append(Color(base.r * sh, base.g * sh, base.b * sh))
	for iy in nv:
		for ix in nu:
			var a := iy * (nu + 1) + ix + 1
			var b := iy * (nu + 1) + ix
			var c := (iy + 1) * (nu + 1) + ix
			var d := (iy + 1) * (nu + 1) + ix + 1
			if iy != 0:
				idx.append(a); idx.append(b); idx.append(d)
			if iy != nv - 1:
				idx.append(b); idx.append(c); idx.append(d)
	var merge: Array = []
	for iy in nv + 1:
		merge.append(Vector2i(iy * (nu + 1), iy * (nu + 1) + nu))
	return Geo.build(pos, idx, cols, null, merge)


# ---- spikes: a flat pointed blade that sweeps back and curls, rooted inside the scalp ------------------------------
static func _spike_mesh(bend: float, flat: float) -> ArrayMesh:
	var key := "%s|%s" % [bend, flat]
	if _spike_geo.has(key):
		return _spike_geo[key]
	var profile: Array = []
	for i in 15:
		var t := float(i) / 14.0
		profile.append(Vector2(maxf(0.0005, pow(1.0 - t, 0.85) * (1.0 + 0.25 * sin(t * PI))), t - 0.12))
	var seg := 12
	var np := profile.size()
	var pos := PackedVector3Array()
	for i in seg + 1:
		var phi := TAU * float(i) / seg
		for j in np:
			var p: Vector2 = profile[j]
			var t := maxf(0.0, p.y + 0.12)
			pos.append(Vector3(p.x * sin(phi), p.y, p.x * cos(phi) * flat - bend * t * t))
	var idx := PackedInt32Array()
	for i in seg:
		for j in np - 1:
			var a := i * np + j
			var b := (i + 1) * np + j
			var c := a + 1
			var d := b + 1
			idx.append(a); idx.append(c); idx.append(b)   # same order as the lathe in three.js
			idx.append(b); idx.append(c); idx.append(d)
	var merge: Array = []
	for j in np:
		merge.append(Vector2i(j, seg * np + j))
	var m := Geo.build(pos, idx, PackedColorArray(), null, merge)
	_spike_geo[key] = m
	return m


## az/el place the root on the head ellipsoid; pitch tilts the spike from straight up toward the back (negative = forward),
## yaw turns it sideways.
static func spike(color: int, hw: float, hh: float, o: Dictionary) -> MeshInstance3D:
	var az: float = o.get("az", 0.0)
	var el: float = o.get("el", 0.5)
	var length: float = o.get("len", 0.2)
	var w: float = o.get("w", 0.05)
	var pitch: float = o.get("pitch", 0.3)
	var yaw: float = o.get("yaw", 0.0)
	var bend: float = o.get("bend", 0.05)
	var flat: float = o.get("flat", 0.55)
	var se := sin(el); var ce := cos(el)
	var rx := 0.205 * hw; var ry := 0.205 * hh; var rz := 0.205
	var m := MeshInstance3D.new()
	m.mesh = _spike_mesh(bend / length, flat)
	var mt := plain_material(color)
	mt.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.material_override = mt
	m.position = Vector3(rx * se * sin(az) * 0.96, ry * ce * 0.96, rz * se * cos(az) * 0.96)
	var b := Basis.from_euler(Vector3(-pitch, az + PI + yaw, 0.0), EULER_ORDER_YXZ)
	b = b * Basis.from_scale(Vector3(w * 1.2, length * 1.35, w * 1.2))
	m.basis = b
	return m


static func _scale_hex(hex: int, k: float) -> int:
	var c := Geo.hex_to_lin(hex)
	return Geo.lin_to_hex(Color(c.r * k, c.g * k, c.b * k))


# ---- styles --------------------------------------------------------------------------------------------------------
## Returns {meshes: [{mesh, pos}], extra: [MeshInstance3D]}
static func build_meshes(L: Dictionary) -> Dictionary:
	var st: String = L.hairStyle
	var c: int = L.hair
	var hw: float = L.headW
	var hh: float = L.headH
	var covered: bool = COVERS.has(L.get("headwear", ""))
	var out: Array = []
	var extra: Array = []
	var base := {"rx": 0.205 * hw, "ry": 0.205 * hh, "rz": 0.205, "cy": 0.0, "color": c}
	var bang_w := func(az: float) -> float: return 1.0 - ss(absf(az), 0.85, 1.25)   # 1 over the forehead, 0 beyond the temples
	var add := func(geo: ArrayMesh, p: Vector3 = Vector3.ZERO) -> void: out.append({"mesh": geo, "pos": p})
	var default_thick := func(_az: float, u: float) -> float: return 0.016 + 0.012 * (1.0 - u)
	var sh := func(o: Dictionary) -> void:
		if covered and not ["long", "bob", "shaggy"].has(st):
			return
		var d := base.duplicate()
		d.merge(o, true)
		if not d.has("thick"):
			d.thick = default_thick
		out.append({"mesh": shell(d), "pos": Vector3.ZERO})
	var hat := func(fn: Callable) -> Callable:
		if covered:
			return func(az: float) -> float:
				var b := ss(absf(az), 1.0, 1.8)
				return 0.3 + (fn.call(az) - 0.3) * b
		return fn
	var with_bangs := func(key: Array, amp: float = 0.035, f: float = 9.0) -> Callable:
		var p := prof(key)
		return func(az: float) -> float: return p.call(az) - amp * bang_w.call(az) * tips(az, f)
	var SHORT := [[0, 0.115], [0.5, 0.105], [1.0, 0.06], [1.35, 0.0], [1.7, -0.02], [2.3, -0.07], [PI, -0.09]]
	var groove_f := func(f: float, amp: float) -> Callable:
		return func(az: float, u: float) -> float: return amp * cos(f * az) * (1.0 - 0.5 * u)
	var el0 := 1.12 if covered else 0.0

	if st == "short":
		sh.call({"el0": el0, "yEnd": hat.call(with_bangs.call(SHORT, 0.035, 9.0)), "groove": groove_f.call(9.0, 0.006)})
	if st == "messy":
		var sp := func(az: float, u: float) -> float:
			return 0.05 * pow(maxf(0.0, cos(7.0 * az + 3.0 * u) * cos(5.0 * u * 1.5 + az)), 2.0)
		sh.call({"el0": el0, "yEnd": hat.call(with_bangs.call(SHORT, 0.05, 7.0)),
			"thick": func(az: float, u: float) -> float: return 0.02 + 0.03 * (1.0 - u) + sp.call(az, u) * (1.0 - u * 0.4),
			"groove": groove_f.call(7.0, 0.005)})
	if st == "shaggy":
		var pf := prof([[0, 0.1], [0.5, 0.09], [1.0, 0.0], [1.5, -0.1], [2.2, -0.16], [PI, -0.18]])
		sh.call({"el0": el0, "yEnd": hat.call(func(az: float) -> float:
				return pf.call(az) - 0.06 * bang_w.call(az) * tips(az, 11.0) - 0.07 * (1.0 - bang_w.call(az)) * tips(az, 11.0, 0.5)),
			"thick": func(_az: float, u: float) -> float: return 0.024 + 0.014 * (1.0 - u), "flare": 0.08, "groove": groove_f.call(11.0, 0.007)})
	if st == "curly":
		sh.call({"el0": el0, "yEnd": hat.call(prof([[0, 0.1], [1.2, 0.02], [2.0, -0.05], [PI, -0.08]])),
			"thick": func(_az: float, _u: float) -> float: return 0.045,
			"groove": func(az: float, u: float) -> float: return 0.03 * sin(11.0 * az + 4.0 * u) * sin(9.0 * u + 2.0 * az) * (1.0 - u * 0.3),
			"grooveAmp": 0.03})
	if st == "puff":
		sh.call({"el0": el0, "yEnd": hat.call(prof([[0, 0.12], [0.8, 0.1], [1.4, -0.02], [PI, -0.1]])),
			"thick": func(_az: float, _u: float) -> float: return 0.085,
			"groove": func(az: float, u: float) -> float: return 0.018 * sin(9.0 * az + 3.0 * u) * sin(7.0 * u + az),
			"grooveAmp": 0.018})
	if st == "long":
		var k := prof([[0, 0.115], [0.5, 0.105], [0.95, 0.0], [1.2, -0.17], [1.57, -0.22], [2.0, -0.32], [2.6, -0.4], [PI, -0.42]])
		sh.call({"el0": el0, "yEnd": hat.call(func(az: float) -> float:
				return k.call(az) - 0.035 * bang_w.call(az) * tips(az, 9.0) - 0.085 * (1.0 - bang_w.call(az)) * tips(az, 9.0, 0.4)),
			"thick": func(_az: float, u: float) -> float: return 0.016 + 0.024 * u + 0.01 * (1.0 - u),
			"flare": 0.2, "groove": groove_f.call(9.0, 0.008)})
	if st == "bob":
		var k2 := prof([[0, 0.11], [0.5, 0.1], [1.0, 0.0], [1.3, -0.1], [1.57, -0.12], [2.2, -0.15], [PI, -0.16]])
		sh.call({"el0": el0, "yEnd": hat.call(func(az: float) -> float:
				return k2.call(az) - 0.03 * bang_w.call(az) * tips(az, 9.0) - 0.02 * (1.0 - bang_w.call(az)) * tips(az, 7.0)),
			"thick": func(_az: float, u: float) -> float: return 0.016 + 0.02 * u,
			"flare": 0.1, "curl": 0.55, "groove": groove_f.call(8.0, 0.006)})
	if ["braid", "braids", "pigtails", "bun", "twinbuns", "topknot", "ponytail"].has(st):
		sh.call({"el0": el0, "yEnd": hat.call(with_bangs.call([[0, 0.115], [0.5, 0.105], [1.0, 0.06], [1.35, 0.0], [1.7, 0.0], [2.3, -0.04], [PI, -0.06]], 0.03, 9.0)),
			"groove": groove_f.call(9.0, 0.006)})
		if not covered and st == "bun":
			add.call(blob(0.1, c), Vector3(0, 0.26, -0.05))
		if not covered and st == "twinbuns":
			for s in [-1.0, 1.0]:
				add.call(blob(0.08, c), Vector3(s * 0.13, 0.25, -0.03))
		if not covered and st == "topknot":
			add.call(blob(0.065, c, 1.0, 1.15, 1.0), Vector3(0, 0.27, -0.03))
		if st == "ponytail":
			add.call(Geo.tube([Vector3(0, 0.14, -0.2), Vector3(0, 0.12, -0.31), Vector3(0, -0.04, -0.36), Vector3(0, -0.26, -0.33), Vector3(0, -0.38, -0.3)], 0.075, 0.015, c, 1.5, 0.06))
		if st == "braid":
			add.call(Geo.tube([Vector3(0, 0.0, -0.18), Vector3(0, -0.14, -0.27), Vector3(0, -0.32, -0.29), Vector3(0, -0.5, -0.29)], 0.058, 0.04, c, 6.0, 0.16))
		if st == "braids":
			for s in [-1.0, 1.0]:
				add.call(Geo.tube([Vector3(s * 0.17, 0.02, -0.03), Vector3(s * 0.19, -0.12, -0.04), Vector3(s * 0.185, -0.3, -0.04), Vector3(s * 0.18, -0.46, -0.04)], 0.05, 0.036, c, 6.0, 0.16))
		if st == "pigtails":
			for s in [-1.0, 1.0]:
				var pts: Array = [Vector3(s * 0.2, -0.08, -0.02), Vector3(s * 0.235, -0.17, -0.03), Vector3(s * 0.25, -0.27, -0.02), Vector3(s * 0.24, -0.36, -0.02)] if covered \
					else [Vector3(s * 0.2, 0.06, -0.02), Vector3(s * 0.27, -0.04, -0.03), Vector3(s * 0.3, -0.18, -0.02), Vector3(s * 0.28, -0.3, -0.02)]
				add.call(Geo.tube(pts, 0.055 if covered else 0.07, 0.018, c, 1.2, 0.06))
	var sp_add := func(list: Array, tone: float = 0.06) -> void:
		for i in list.size():
			extra.append(spike(_scale_hex(c, 1.0 + ((i % 3) - 1) * tone), hw, hh, list[i]))
	if st == "spiky":  # JRPG hero: swept-back spikes, two front bangs
		sh.call({"el0": el0, "yEnd": hat.call(with_bangs.call([[0, 0.1], [0.5, 0.09], [1.0, 0.05], [1.35, 0.0], [1.7, -0.02], [2.3, -0.06], [PI, -0.08]], 0.0, 9.0)),
			"groove": groove_f.call(9.0, 0.004)})
		if not covered:
			sp_add.call([
				{"az": 0.32, "el": 0.8, "len": 0.17, "w": 0.052, "pitch": 2.1, "yaw": 0.35, "bend": 0.03}, {"az": -0.32, "el": 0.8, "len": 0.17, "w": 0.052, "pitch": 2.1, "yaw": -0.35, "bend": 0.03},
				{"az": 0, "el": 0.78, "len": 0.14, "w": 0.045, "pitch": 2.4, "yaw": 0, "bend": 0.02},
				{"az": 0, "el": 0.3, "len": 0.27, "w": 0.075, "pitch": 0.9, "bend": 0.08}, {"az": 0.85, "el": 0.55, "len": 0.25, "w": 0.07, "pitch": 1.0, "yaw": 0.55, "bend": 0.07},
				{"az": -0.85, "el": 0.55, "len": 0.25, "w": 0.07, "pitch": 1.0, "yaw": -0.55, "bend": 0.07},
				{"az": 1.7, "el": 0.85, "len": 0.22, "w": 0.07, "pitch": 1.0, "yaw": 0, "bend": 0.1}, {"az": -1.7, "el": 0.85, "len": 0.22, "w": 0.07, "pitch": 1.0, "yaw": 0, "bend": 0.1},
				{"az": 2.6, "el": 0.9, "len": 0.22, "w": 0.07, "pitch": 1.15, "yaw": 0, "bend": 0.1}, {"az": -2.6, "el": 0.9, "len": 0.22, "w": 0.07, "pitch": 1.15, "yaw": 0, "bend": 0.1},
				{"az": PI, "el": 0.75, "len": 0.24, "w": 0.075, "pitch": 1.3, "yaw": 0, "bend": 0.06}])
	if st == "spikes":  # short, upright and cheeky
		sh.call({"el0": el0, "yEnd": hat.call(with_bangs.call(SHORT, 0.03, 9.0)), "groove": groove_f.call(9.0, 0.004)})
		if not covered:
			var list: Array = []
			var azs := [0.0, 0.7, -0.7, 1.4, -1.4, 2.2, -2.2, PI]
			for i in azs.size():
				var a: float = azs[i]
				list.append({"az": a, "el": 0.28 + absf(a) * 0.22 * 0.6, "len": 0.2 - (i % 2) * 0.05, "w": 0.062,
					"pitch": 0.2 + absf(cos(a / 2.0)) * 0.1 + absf(a) * 0.12, "yaw": 0.0, "bend": 0.03})
			sp_add.call(list)
	if st == "wild":  # long, jagged, windswept
		var pw := prof([[0, 0.1], [0.5, 0.08], [1.0, 0.0], [1.5, -0.12], [2.2, -0.2], [PI, -0.22]])
		sh.call({"el0": el0, "yEnd": hat.call(func(az: float) -> float: return pw.call(az) - 0.05 * tips(az, 9.0)),
			"thick": func(_az: float, u: float) -> float: return 0.02 + 0.014 * (1.0 - u), "flare": 0.1, "groove": groove_f.call(9.0, 0.006)})
		if not covered:
			sp_add.call([
				{"az": 0.3, "el": 0.8, "len": 0.2, "w": 0.06, "pitch": 2.0, "yaw": 0.5, "bend": 0.04}, {"az": -0.3, "el": 0.8, "len": 0.2, "w": 0.06, "pitch": 2.0, "yaw": -0.5, "bend": 0.04},
				{"az": 0, "el": 0.3, "len": 0.22, "w": 0.07, "pitch": 0.7, "bend": 0.07},
				{"az": 1.2, "el": 0.9, "len": 0.25, "w": 0.07, "pitch": 1.5, "yaw": 0, "bend": 0.14}, {"az": -1.2, "el": 0.9, "len": 0.25, "w": 0.07, "pitch": 1.5, "yaw": 0, "bend": 0.14},
				{"az": 2.4, "el": 1.0, "len": 0.28, "w": 0.075, "pitch": 1.7, "yaw": 0, "bend": 0.16}, {"az": -2.4, "el": 1.0, "len": 0.28, "w": 0.075, "pitch": 1.7, "yaw": 0, "bend": 0.16},
				{"az": PI, "el": 1.0, "len": 0.36, "w": 0.08, "pitch": 2.3, "yaw": 0, "bend": 0.1}])
	if st == "swept":  # anime side-swept fringe over one eye
		var psw := prof([[0, 0.06], [0.5, 0.09], [1.0, 0.04], [1.4, -0.03], [2.0, -0.07], [PI, -0.09]])
		sh.call({"el0": el0, "yEnd": hat.call(func(az: float) -> float: return psw.call(az) - 0.07 * maxf(0.0, sin(az + 0.6)) * bang_w.call(az)),
			"groove": groove_f.call(9.0, 0.005)})
		if not covered:
			sp_add.call([
				{"az": -0.2, "el": 0.75, "len": 0.22, "w": 0.1, "pitch": 2.3, "yaw": 0.9, "bend": 0.0, "flat": 0.4},
				{"az": 0.5, "el": 0.8, "len": 0.17, "w": 0.07, "pitch": 2.1, "yaw": 0.6, "bend": 0.0, "flat": 0.45},
				{"az": 1.5, "el": 1.1, "len": 0.14, "w": 0.07, "pitch": 2.9, "yaw": 1.5, "bend": 0.03}])
	if st == "tonsure":  # monk's fringe: a wedge-shaped band, pointed at the temples, thicker at the back
		var top := prof([[0, 1.5], [1.0, 1.42], [1.4, 1.2], [2.2, 1.04], [PI, 1.0]])
		var bot := prof([[0, 0.3], [1.0, 0.3], [1.3, 0.05], [1.7, -0.02], [2.4, -0.07], [PI, -0.09]])
		sh.call({"el0": top, "yEnd": func(az: float) -> float: return bot.call(az) - 0.02 * tips(az, 9.0) * ss(absf(az), 1.5, 2.2),
			"thick": func(az: float, _u: float) -> float: return 0.022 + 0.012 * ss(absf(az), 1.4, 2.6), "groove": groove_f.call(8.0, 0.005)})
	if st == "receding":
		var top2 := prof([[0, 1.55], [1.1, 1.45], [1.45, 1.2], [2.0, 0.98], [PI, 0.8]])
		var bot2 := prof([[0, 0.3], [1.1, 0.3], [1.35, 0.06], [1.7, -0.02], [2.4, -0.06], [PI, -0.08]])
		sh.call({"el0": top2, "yEnd": func(az: float) -> float: return bot2.call(az) - 0.02 * tips(az, 9.0) * ss(absf(az), 1.5, 2.2),
			"thick": func(_az: float, _u: float) -> float: return 0.024, "groove": groove_f.call(8.0, 0.004)})
	if st == "bald":
		sh.call({"el0": 1.3, "yEnd": prof([[0, 0.3], [1.25, 0.3], [1.5, 0.04], [1.85, 0.3], [PI, 0.3]]),
			"thick": func(_az: float, _u: float) -> float: return 0.02})
	return {"meshes": out, "extra": extra}


static func build(head: Node3D, L: Dictionary) -> void:
	var r := build_meshes(L)
	for m in r.extra:
		head.add_child(m)
	for e in r.meshes:
		var mi := MeshInstance3D.new()
		mi.mesh = e.mesh
		mi.material_override = material()
		mi.position = e.pos
		head.add_child(mi)
