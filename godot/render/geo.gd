class_name Geo
extends RefCounted
## Geometry helpers shared by the character builders: three.js-compatible smoothstep/spline/lathe/tube and a
## smooth-normal ArrayMesh builder. Triangles are authored counter-clockwise-outward like three.js; `build` emits
## them clockwise (Godot's front-face winding).

## Detail multiplier for generated meshes: 1.0 = full, <1 = a cheaper level of detail (see People.build_ray).
static var lod := 1.0


static func q(n: int, min_n: int = 4) -> int:
	return maxi(min_n, roundi(n * lod))


# ---- maths ------------------------------------------------------------------------------------------------------
## three.js MathUtils.smoothstep(x, min, max) (note: Godot's smoothstep takes the edges first)
static func ss(x: float, a: float, b: float) -> float:
	if x <= a:
		return 0.0
	if x >= b:
		return 1.0
	var t := (x - a) / (b - a)
	return t * t * (3.0 - 2.0 * t)


static func hex_to_lin(h: int) -> Color:
	return GameData.col(h).srgb_to_linear()


static func lin_to_hex(c: Color) -> int:
	var s := c.linear_to_srgb()
	return (roundi(s.r * 255.0) << 16) | (roundi(s.g * 255.0) << 8) | roundi(s.b * 255.0)


## three.js style: lerp towards black (amt < 0) or white (amt > 0) in linear space.
static func tint(hex: int, amt: float) -> int:
	var c := hex_to_lin(hex)
	c = c.lerp(Color(0, 0, 0), -amt) if amt < 0.0 else c.lerp(Color(1, 1, 1), amt)
	return lin_to_hex(c)


static func mix_hex(a: int, b: int, t: float) -> int:
	return lin_to_hex(hex_to_lin(a).lerp(hex_to_lin(b), t))


static func _cr(t: float, p0: float, p1: float, p2: float, p3: float) -> float:
	var v0 := (p2 - p0) * 0.5
	var v1 := (p3 - p1) * 0.5
	var t2 := t * t
	var t3 := t * t2
	return (2.0 * p1 - 2.0 * p2 + v0 + v1) * t3 + (-3.0 * p1 + 3.0 * p2 - 2.0 * v0 - v1) * t2 + v0 * t + p1


## THREE.SplineCurve(points).getPoints(divisions)
static func spline2(pts: Array, divisions: int) -> Array[Vector2]:
	var out: Array[Vector2] = []
	var n := pts.size()
	for d in divisions + 1:
		var t := float(d) / divisions
		var p := (n - 1) * t
		var ip := int(floor(p))
		var w := p - ip
		var p0: Vector2 = pts[0 if ip == 0 else ip - 1]
		var p1: Vector2 = pts[ip]
		var p2: Vector2 = pts[n - 1 if ip > n - 2 else ip + 1]
		var p3: Vector2 = pts[n - 1 if ip > n - 3 else ip + 2]
		out.append(Vector2(_cr(w, p0.x, p1.x, p2.x, p3.x), _cr(w, p0.y, p1.y, p2.y, p3.y)))
	return out


static func spline3_point(pts: Array, t: float) -> Vector3:
	var n := pts.size()
	var p := (n - 1) * t
	var ip := int(floor(p))
	var w := p - ip
	var p0: Vector3 = pts[0 if ip == 0 else ip - 1]
	var p1: Vector3 = pts[mini(ip, n - 1)]
	var p2: Vector3 = pts[n - 1 if ip > n - 2 else ip + 1]
	var p3: Vector3 = pts[n - 1 if ip > n - 3 else ip + 2]
	return Vector3(_cr(w, p0.x, p1.x, p2.x, p3.x), _cr(w, p0.y, p1.y, p2.y, p3.y), _cr(w, p0.z, p1.z, p2.z, p3.z))


# ---- mesh building ----------------------------------------------------------------------------------------------
static func vertex_normals(pos: PackedVector3Array, idx: PackedInt32Array) -> PackedVector3Array:
	var nrm := PackedVector3Array()
	nrm.resize(pos.size())
	var i := 0
	while i < idx.size():
		var a := idx[i]; var b := idx[i + 1]; var c := idx[i + 2]
		var n := (pos[b] - pos[a]).cross(pos[c] - pos[a])
		nrm[a] += n; nrm[b] += n; nrm[c] += n
		i += 3
	for k in nrm.size():
		var l := nrm[k].length()
		nrm[k] = nrm[k] / l if l > 1e-12 else Vector3.UP
	return nrm


## Builds an ArrayMesh from CCW-outward triangles. `ref` (one Vector3, or a PackedVector3Array per vertex) is a point
## inside the shape: if normals mostly point towards it the winding is flipped. `merge` lists vertex pairs (seams) whose
## normals are averaged. `uvs`/`colors` optional.
static func build(pos: PackedVector3Array, idx: PackedInt32Array, colors: PackedColorArray = PackedColorArray(),
		ref: Variant = Vector3.ZERO, merge: Array = [], uvs: PackedVector2Array = PackedVector2Array(),
		normals_in: PackedVector3Array = PackedVector3Array(), overrides: Dictionary = {}) -> ArrayMesh:
	# 1) winding: which way do the authored triangles face relative to the reference point(s)?
	#    ref == null means "literal": trust the authored CCW order exactly as three.js would (double-sided meshes).
	var per_vertex: bool = ref is PackedVector3Array
	var score := 0.0
	var i := 0
	while ref != null and i < idx.size():
		var a := idx[i]; var b := idx[i + 1]; var c := idx[i + 2]
		var gn := (pos[b] - pos[a]).cross(pos[c] - pos[a])
		var cen := (pos[a] + pos[b] + pos[c]) / 3.0
		var center: Vector3 = (ref[a] + ref[b] + ref[c]) / 3.0 if per_vertex else ref
		score += gn.dot(cen - center)
		i += 3
	var ccw_outward := score >= 0.0 or ref == null
	# 2) normals: outward, smooth
	var nrm := PackedVector3Array()
	if normals_in.size() == pos.size():
		nrm = normals_in.duplicate()
	else:
		nrm = vertex_normals(pos, idx)
		if not ccw_outward:
			for v in nrm.size():
				nrm[v] = -nrm[v]
	for pr in merge:
		var sm: Vector3 = nrm[pr.x] + nrm[pr.y]
		var l := sm.length()
		sm = sm / l if l > 1e-12 else sm
		nrm[pr.x] = sm
		nrm[pr.y] = sm
	for k in overrides:
		nrm[k] = overrides[k]
	# 3) emit clockwise-from-outside (Godot front faces)
	var out := PackedInt32Array()
	out.resize(idx.size())
	i = 0
	while i < idx.size():
		if ccw_outward:
			out[i] = idx[i]; out[i + 1] = idx[i + 2]; out[i + 2] = idx[i + 1]
		else:
			out[i] = idx[i]; out[i + 1] = idx[i + 1]; out[i + 2] = idx[i + 2]
		i += 3
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = pos
	arrays[Mesh.ARRAY_NORMAL] = nrm
	if colors.size() == pos.size():
		arrays[Mesh.ARRAY_COLOR] = colors
	if uvs.size() == pos.size():
		arrays[Mesh.ARRAY_TEX_UV] = uvs
	arrays[Mesh.ARRAY_INDEX] = out
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return m


## THREE.LatheGeometry: profile points (radius, y) rotated about Y. Profile should run bottom -> top for outward faces.
## `color_fn(i_point, y, theta) -> Color` optional (vertex colours, linear).
static func lathe(points: Array, segments: int, color_fn: Callable = Callable()) -> ArrayMesh:
	var np := points.size()
	var pos := PackedVector3Array()
	var nrm := PackedVector3Array()
	var cols := PackedColorArray()
	var prof_n: Array[Vector2] = []
	for j in np:
		var sum := Vector2.ZERO
		if j < np - 1:
			var d: Vector2 = points[j + 1] - points[j]
			var n := Vector2(d.y, -d.x)
			sum += n.normalized() if n.length() > 1e-9 else Vector2.ZERO
		if j > 0:
			var d2: Vector2 = points[j] - points[j - 1]
			var n2 := Vector2(d2.y, -d2.x)
			sum += n2.normalized() if n2.length() > 1e-9 else Vector2.ZERO
		prof_n.append(sum.normalized() if sum.length() > 1e-9 else Vector2(1, 0))
	for i in segments + 1:
		var phi := TAU * float(i) / segments
		var s := sin(phi)
		var c := cos(phi)
		for j in np:
			var p: Vector2 = points[j]
			pos.append(Vector3(p.x * s, p.y, p.x * c))
			nrm.append(Vector3(prof_n[j].x * s, prof_n[j].y, prof_n[j].x * c))
			if color_fn.is_valid():
				cols.append(color_fn.call(j, p.y, atan2(p.x * s, p.x * c)))
	var idx := PackedInt32Array()
	for i in segments:
		for j in np - 1:
			var a := i * np + j
			var b := (i + 1) * np + j
			var c2 := a + 1
			var d3 := b + 1
			idx.append(a); idx.append(c2); idx.append(b)
			idx.append(b); idx.append(c2); idx.append(d3)
	return build(pos, idx, cols, _lathe_ref(points), [], PackedVector2Array(), nrm)


static func _lathe_ref(points: Array) -> Vector3:
	# a point on the axis in the middle of the profile
	var lo := INF
	var hi := -INF
	for p in points:
		lo = minf(lo, p.y)
		hi = maxf(hi, p.y)
	return Vector3(0, (lo + hi) * 0.5, 0)


## Tube along a Catmull-Rom path with a rippled / twisted circular section (hair braids, ponytails, hat tails...).
## Returns an ArrayMesh with vertex colours = linear(color) * shade.
static func tube(pts_in: Array, r0: float, r1: float, color: int, twist: float = 0.0, rip: float = 0.08, seg_in: int = 12, n_in: int = 28) -> ArrayMesh:
	var seg := q(seg_in, 5)
	var n := q(n_in, 10)
	var pts: Array = []
	for p in pts_in:
		pts.append(p if p is Vector3 else Vector3(p[0], p[1], p[2]))
	var path: Array[Vector3] = []
	for i in n + 1:
		path.append(spline3_point(pts, float(i) / n))
	# tangents by finite difference, then parallel-transport frames (three.js computeFrenetFrames)
	var tang: Array[Vector3] = []
	for i in n + 1:
		var a := spline3_point(pts, maxf(0.0, float(i) / n - 0.0005))
		var b := spline3_point(pts, minf(1.0, float(i) / n + 0.0005))
		tang.append((b - a).normalized())
	var normals: Array[Vector3] = []
	var binorm: Array[Vector3] = []
	normals.resize(n + 1)
	binorm.resize(n + 1)
	var t0 := tang[0]
	var mn := INF
	var vec := Vector3.RIGHT
	var ax := [absf(t0.x), absf(t0.y), absf(t0.z)]
	if ax[0] <= mn:
		mn = ax[0]; vec = Vector3.RIGHT
	if ax[1] <= mn:
		mn = ax[1]; vec = Vector3.UP
	if ax[2] <= mn:
		vec = Vector3.BACK
	var nv := t0.cross(vec).normalized()
	normals[0] = t0.cross(nv).normalized()
	binorm[0] = t0.cross(normals[0])
	for i in range(1, n + 1):
		normals[i] = normals[i - 1]
		binorm[i] = binorm[i - 1]
		var axis := tang[i - 1].cross(tang[i])
		if axis.length() > 1e-9:
			axis = axis.normalized()
			var th := acos(clampf(tang[i - 1].dot(tang[i]), -1.0, 1.0))
			normals[i] = normals[i].rotated(axis, th)
		binorm[i] = tang[i].cross(normals[i])
	var pos := PackedVector3Array()
	var cols := PackedColorArray()
	var ref := PackedVector3Array()
	var base := hex_to_lin(color)
	for i in n + 1:
		var t := float(i) / n
		var rad := r0 + (r1 - r0) * t
		if t > 0.9:
			rad *= sqrt(maxf(0.0, 1.0 - pow((t - 0.9) / 0.1, 2.0)))
		for k in seg + 1:
			var th2 := TAU * float(k) / seg
			var w := sin(th2 * 2.0 + t * twist * TAU)
			var rr := rad * (1.0 + rip * w)
			pos.append(path[i] + (normals[i] * cos(th2) + binorm[i] * sin(th2)) * rr)
			ref.append(path[i])
			var sh := 0.88 + 0.12 * (0.5 + 0.5 * w)
			cols.append(Color(base.r * sh, base.g * sh, base.b * sh))
	var idx := PackedInt32Array()
	var w2 := seg + 1
	for i in n:
		for k in seg:
			var a := i * w2 + k
			var b := a + 1
			var c := a + w2
			var d := c + 1
			idx.append(a); idx.append(b); idx.append(c)
			idx.append(b); idx.append(d); idx.append(c)
	return build(pos, idx, cols, ref)
