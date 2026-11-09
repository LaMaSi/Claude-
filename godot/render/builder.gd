class_name Builder
extends RefCounted
## Collects flat-shaded low-poly geometry (boxes, cylinders, icospheres...) into a few merged meshes.
## Colour lives in vertex colours, so ALL opaque static geometry with the same material options is one draw call
## (important on phones). Pieces that must change at runtime (flames, lamp glass, windows) are created with
## `dynamic_*` and returned as standalone MeshInstance3D nodes.
##
## Conventions match the three.js prototype: Y up, local +z is the front, `y` of box/cyl is the BOTTOM.
## Triangles are authored counter-clockwise (outward normal = (b-a)x(c-a)); flat normals are computed on commit.

var xf := Transform3D.IDENTITY
var _stack: Array[Transform3D] = []
var shadow := true   # pieces added while false go to a no-shadow surface
var _surf: Dictionary = {}  # signature -> {verts, cols, opts, shadow}
var _ico_cache: Dictionary = {}
static var capture := false           # debug: record every box so tests can look for coplanar faces
static var captured: Array = []
## Where dynamic nodes (flames, lights, glass) are added, and where models register them for the day/night code.
var dyn_parent: Node3D
var reg := {"lamp_shades": [], "lamp_lights": [], "flames": [], "fire_lights": [], "window_glass": []}


func push(pos: Vector3 = Vector3.ZERO, rot_y: float = 0.0, scl: float = 1.0) -> void:
	_stack.append(xf)
	xf = xf * Transform3D(Basis(Vector3.UP, rot_y).scaled(Vector3(scl, scl, scl)), pos)


func pop() -> void:
	xf = _stack.pop_back()


static func _sig(opts: Dictionary, sh: bool) -> String:
	return "%s|%s" % [JSON.stringify(opts), sh]


func _bucket(opts: Dictionary) -> Dictionary:
	var key := _sig(opts, shadow)
	if not _surf.has(key):
		_surf[key] = {"verts": PackedVector3Array(), "cols": PackedColorArray(), "opts": opts, "shadow": shadow}
	return _surf[key]


func _tri(b: Dictionary, col: Color, a: Vector3, bb: Vector3, c: Vector3) -> void:
	b.verts.append(a); b.verts.append(bb); b.verts.append(c)
	b.cols.append(col); b.cols.append(col); b.cols.append(col)


func _quad(b: Dictionary, col: Color, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3) -> void:
	_tri(b, col, p0, p1, p2)
	_tri(b, col, p0, p2, p3)


## Adds a triangle wound so its normal points away from `inside` (a point in the shape's interior).
func _tri_o(b: Dictionary, col: Color, a: Vector3, bb: Vector3, c: Vector3, inside: Vector3) -> void:
	var n := (bb - a).cross(c - a)
	if n.dot((a + bb + c) / 3.0 - inside) < 0.0:
		_tri(b, col, a, c, bb)
	else:
		_tri(b, col, a, bb, c)


func _quad_o(b: Dictionary, col: Color, p0: Vector3, p1: Vector3, p2: Vector3, p3: Vector3, inside: Vector3) -> void:
	_tri_o(b, col, p0, p1, p2, inside)
	_tri_o(b, col, p0, p2, p3, inside)


func _local(pos: Vector3, rot: Vector3) -> Transform3D:
	var bas := Basis.from_euler(rot, EULER_ORDER_XYZ) if rot != Vector3.ZERO else Basis.IDENTITY
	return xf * Transform3D(bas, pos)


# ---- primitives -------------------------------------------------------------------------------------------------
## Box whose bottom-centre is (x, y, z). rot = Euler rotation about the box centre (radians).
func box(w: float, h: float, d: float, color: int, x: float, y: float, z: float, _r: float = 0.0,
		rot: Vector3 = Vector3.ZERO, opts: Dictionary = {}) -> void:
	var t := _local(Vector3(x, y + h / 2.0, z), rot)
	var b := _bucket(opts)
	var col := GameData.col(color)
	var hx := w / 2.0; var hy := h / 2.0; var hz := d / 2.0
	if capture:
		captured.append({"t": t, "half": Vector3(hx, hy, hz), "opts": opts})
	var v: Array[Vector3] = []
	for sx in [-1.0, 1.0]:
		for sy in [-1.0, 1.0]:
			for sz in [-1.0, 1.0]:
				v.append(t * Vector3(sx * hx, sy * hy, sz * hz))
	# index = sx*4 + sy*2 + sz  with (sx,sy,sz) in {0:-1, 1:+1}
	_quad_o(b, col, v[4], v[5], v[7], v[6], t.origin)  # +x
	_quad_o(b, col, v[0], v[2], v[3], v[1], t.origin)  # -x
	_quad_o(b, col, v[2], v[6], v[7], v[3], t.origin)  # +y
	_quad_o(b, col, v[0], v[1], v[5], v[4], t.origin)  # -y
	_quad_o(b, col, v[1], v[3], v[7], v[5], t.origin)  # +z
	_quad_o(b, col, v[0], v[4], v[6], v[2], t.origin)  # -z


## Cylinder / cone / frustum. Bottom at y. theta_len < TAU gives an open arc (no side wedge), like three.js.
func cyl(rt: float, rb: float, h: float, color: int, x: float, y: float, z: float, seg: int = 10,
		opts: Dictionary = {}, rot: Vector3 = Vector3.ZERO, theta_start: float = 0.0, theta_len: float = TAU) -> void:
	var t := _local(Vector3(x, y + h / 2.0, z), rot)
	var b := _bucket(opts)
	var col := GameData.col(color)
	var hh := h / 2.0
	for i in seg:
		var a0 := theta_start + theta_len * float(i) / seg
		var a1 := theta_start + theta_len * float(i + 1) / seg
		var s0 := sin(a0); var c0 := cos(a0); var s1 := sin(a1); var c1 := cos(a1)
		var tl := t * Vector3(rt * s0, hh, rt * c0); var tr := t * Vector3(rt * s1, hh, rt * c1)
		var bl := t * Vector3(rb * s0, -hh, rb * c0); var br := t * Vector3(rb * s1, -hh, rb * c1)
		_quad_o(b, col, bl, tl, tr, br, t.origin)
		if rt > 0.0:
			_tri_o(b, col, t * Vector3(0, hh, 0), tr, tl, t.origin)
		if rb > 0.0:
			_tri_o(b, col, t * Vector3(0, -hh, 0), bl, br, t.origin)


func _ico_faces(detail: int) -> Array:
	if _ico_cache.has(detail):
		return _ico_cache[detail]
	var tt := (1.0 + sqrt(5.0)) / 2.0
	var vs: Array[Vector3] = [
		Vector3(-1, tt, 0), Vector3(1, tt, 0), Vector3(-1, -tt, 0), Vector3(1, -tt, 0),
		Vector3(0, -1, tt), Vector3(0, 1, tt), Vector3(0, -1, -tt), Vector3(0, 1, -tt),
		Vector3(tt, 0, -1), Vector3(tt, 0, 1), Vector3(-tt, 0, -1), Vector3(-tt, 0, 1)]
	var idx := [0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11, 1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
		3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9, 4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1]
	var n := detail + 1
	var out: Array = []
	for f in 20:
		var a: Vector3 = vs[idx[f * 3]]; var bb: Vector3 = vs[idx[f * 3 + 1]]; var c: Vector3 = vs[idx[f * 3 + 2]]
		# subdivide the face into n*n small triangles, then push to the unit sphere
		for i in n:
			for j in n - i:
				var p := func(ii: int, jj: int) -> Vector3:
					return (a + (c - a) * (float(ii) / n) + (bb - a) * (float(jj) / n)).normalized()
				out.append([p.call(i, j), p.call(i, j + 1), p.call(i + 1, j)])
				if j < n - i - 1:
					out.append([p.call(i, j + 1), p.call(i + 1, j + 1), p.call(i + 1, j)])
	_ico_cache[detail] = out
	return out


## Faceted ball centred at (x, y, z); sy squashes it vertically (like mesh.scale.y).
func ball(r: float, color: int, x: float, y: float, z: float, detail: int = 1, sy: float = 1.0,
		opts: Dictionary = {}) -> void:
	var t := _local(Vector3(x, y, z), Vector3.ZERO)
	t.basis = t.basis * Basis.from_scale(Vector3(1, sy, 1))
	var b := _bucket(opts)
	var col := GameData.col(color)
	for f in _ico_faces(detail):
		_tri_o(b, col, t * (f[0] * r), t * (f[1] * r), t * (f[2] * r), t.origin)


## Torus lying in the XZ plane (ring axis = Y), centred at (x, y, z).
func torus(big: float, small: float, color: int, x: float, y: float, z: float, seg_big: int = 16, seg_small: int = 6,
		opts: Dictionary = {}) -> void:
	var t := _local(Vector3(x, y, z), Vector3.ZERO)
	var b := _bucket(opts)
	var col := GameData.col(color)
	var pts: Array = []
	for i in seg_big + 1:
		var u := TAU * i / seg_big
		var row: Array = []
		for j in seg_small + 1:
			var v := TAU * j / seg_small
			row.append(t * Vector3((big + small * cos(v)) * cos(u), small * sin(v), (big + small * cos(v)) * sin(u)))
		pts.append(row)
	for i in seg_big:
		for j in seg_small:
			var um := TAU * (i + 0.5) / seg_big
			_quad_o(b, col, pts[i][j], pts[i + 1][j], pts[i + 1][j + 1], pts[i][j + 1], t * Vector3(big * cos(um), 0, big * sin(um)))


## Flat upward-facing disc (grass patches).
func disc(r: float, seg: int, color: int, x: float, y: float, z: float, opts: Dictionary = {}) -> void:
	var t := _local(Vector3(x, y, z), Vector3.ZERO)
	var b := _bucket(opts)
	var col := GameData.col(color)
	for i in seg:
		var a0 := TAU * i / seg; var a1 := TAU * (i + 1) / seg
		_tri_o(b, col, t.origin, t * Vector3(r * cos(a1), 0, r * sin(a1)), t * Vector3(r * cos(a0), 0, r * sin(a0)),
			t.origin - Vector3.UP)


# ---- runtime-changing pieces ------------------------------------------------------------------------------------
## A standalone box mesh with its own StandardMaterial3D (alpha/emission animated from outside).
func dynamic_box(w: float, h: float, d: float, mat: StandardMaterial3D, x: float, y: float, z: float,
		rot: Vector3 = Vector3.ZERO) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new(); bm.size = Vector3(w, h, d)
	mi.mesh = bm
	mi.material_override = mat
	mi.transform = _local(Vector3(x, y + h / 2.0, z), rot)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF if mat.transparency != BaseMaterial3D.TRANSPARENCY_DISABLED else GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	if dyn_parent:
		dyn_parent.add_child(mi)
	return mi


## A standalone cone (flame) centred at (x, y, z).
func dynamic_cone(r: float, h: float, mat: StandardMaterial3D, x: float, y: float, z: float, seg: int = 5) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.0; cm.bottom_radius = r; cm.height = h; cm.radial_segments = seg; cm.rings = 1
	mi.mesh = cm
	mi.material_override = mat
	mi.transform = _local(Vector3(x, y, z), Vector3.ZERO)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if dyn_parent:
		dyn_parent.add_child(mi)
	return mi


## A point light at local (x, y, z); `kind` is the registry list it joins ("lamp_lights" or "fire_lights").
func light(color: int, range_m: float, x: float, y: float, z: float, kind: String) -> OmniLight3D:
	var l := OmniLight3D.new()
	l.light_color = GameData.col(color)
	l.omni_range = range_m
	l.omni_attenuation = 1.6
	l.shadow_enabled = false
	l.position = xf * Vector3(x, y, z)
	l.light_energy = 0.0
	if dyn_parent:
		dyn_parent.add_child(l)
	reg[kind].append(l)
	return l


## Emissive unlit-ish material for flames / lamp glass.
static func glow_material(color: int, emissive: int, intensity: float) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = GameData.col(color)
	m.roughness = 0.6
	m.emission_enabled = true
	m.emission = GameData.col(emissive)
	m.emission_energy_multiplier = intensity
	return m


# ---- commit -----------------------------------------------------------------------------------------------------
func _make_material(opts: Dictionary) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	m.vertex_color_is_srgb = true
	m.roughness = opts.get("roughness", 0.9)
	m.metallic = opts.get("metalness", 0.0)
	if opts.has("emissive"):
		m.emission_enabled = true
		m.emission = GameData.col(opts.emissive)
		m.emission_energy_multiplier = opts.get("emissive_intensity", 1.0)
	if opts.has("opacity"):
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		m.albedo_color = Color(1, 1, 1, opts.opacity)
	return m


## Turns everything collected so far into MeshInstance3D children of `parent`; returns them.
func commit(parent: Node3D) -> Array[MeshInstance3D]:
	var made: Array[MeshInstance3D] = []
	for key in _surf:
		var s: Dictionary = _surf[key]
		var vin: PackedVector3Array = s.verts
		if vin.is_empty():
			continue
		var n := vin.size()
		var verts := PackedVector3Array(); verts.resize(n)
		var norms := PackedVector3Array(); norms.resize(n)
		var i := 0
		while i < n:
			var a := vin[i]; var b := vin[i + 1]; var c := vin[i + 2]
			var nrm := (b - a).cross(c - a)
			nrm = nrm.normalized() if nrm.length_squared() > 1e-12 else Vector3.UP
			# Godot's front faces are clockwise: swap b and c
			verts[i] = a; verts[i + 1] = c; verts[i + 2] = b
			norms[i] = nrm; norms[i + 1] = nrm; norms[i + 2] = nrm
			i += 3
		var cols: PackedColorArray = s.cols
		var cols2 := PackedColorArray(); cols2.resize(n)
		i = 0
		while i < n:
			cols2[i] = cols[i]; cols2[i + 1] = cols[i]; cols2[i + 2] = cols[i]
			i += 3
		var arrays := []
		arrays.resize(Mesh.ARRAY_MAX)
		arrays[Mesh.ARRAY_VERTEX] = verts
		arrays[Mesh.ARRAY_NORMAL] = norms
		arrays[Mesh.ARRAY_COLOR] = cols2
		var am := ArrayMesh.new()
		am.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
		am.surface_set_material(0, _make_material(s.opts))
		var mi := MeshInstance3D.new()
		mi.mesh = am
		mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON if s.shadow else GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		if s.opts.has("opacity"):
			mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		parent.add_child(mi)
		made.append(mi)
	_surf.clear()
	return made
