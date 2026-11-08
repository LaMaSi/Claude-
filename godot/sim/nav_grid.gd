class_name NavGrid
extends RefCounted
## Fine navigation grid (0.25 units). Obstacles are rasterised with a margin equal to the character radius,
## so slightly overlapping furniture never breaks pathfinding. Points are Vector2(x, z).

var step := 0.25
var x0 := 0.0
var z0 := 0.0
var nx := 0
var nz := 0
var blocked := PackedByteArray()


func _init(bounds: Dictionary, p_step: float = 0.25) -> void:
	step = p_step
	x0 = bounds.x0
	z0 = bounds.z0
	nx = ceili((float(bounds.x1) - x0) / step)
	nz = ceili((float(bounds.z1) - z0) / step)
	blocked.resize(nx * nz)


func cell_x(x: float) -> int:
	return floori((x - x0) / step)


func cell_z(z: float) -> int:
	return floori((z - z0) / step)


func inside(ix: int, iz: int) -> bool:
	return ix >= 0 and iz >= 0 and ix < nx and iz < nz


func center(ix: int, iz: int) -> Vector2:
	return Vector2(x0 + (ix + 0.5) * step, z0 + (iz + 0.5) * step)


func walkable(x: float, z: float) -> bool:
	var ix := cell_x(x)
	var iz := cell_z(z)
	return inside(ix, iz) and blocked[iz * nx + ix] == 0


## obbs: {x,z,rot,hw,hd}; circles: {x,z,r}. Same rotation convention as Node3D.rotation.y.
func rasterize(obbs: Array, circles: Array, margin: float) -> void:
	for iz in nz:
		for ix in nx:
			var p := center(ix, iz)
			var b := false
			for o in obbs:
				var r: float = o.get("rot", 0.0)
				var c := cos(r)
				var s := sin(r)
				var dx: float = p.x - o.x
				var dz: float = p.y - o.z
				var lx := dx * c - dz * s
				var lz := dx * s + dz * c
				if absf(lx) <= o.hw + margin and absf(lz) <= o.hd + margin:
					b = true
					break
			if not b:
				for k in circles:
					var rr: float = k.r + margin
					if (p.x - k.x) * (p.x - k.x) + (p.y - k.z) * (p.y - k.z) <= rr * rr:
						b = true
						break
			blocked[iz * nx + ix] = 1 if b else 0


func nearest_walkable(x: float, z: float, max_r: int = 40) -> Variant:
	if walkable(x, z):
		return Vector2(x, z)
	var cx := cell_x(x)
	var cz := cell_z(z)
	var best: Variant = null
	var best_d := INF
	var found := -1
	for r in range(1, max_r + 1):
		if found >= 0 and r > found + 1:
			break
		for dz in range(-r, r + 1):
			for dx in range(-r, r + 1):
				if maxi(absi(dx), absi(dz)) != r:
					continue
				var ix := cx + dx
				var iz := cz + dz
				if not inside(ix, iz) or blocked[iz * nx + ix] != 0:
					continue
				var c := center(ix, iz)
				var d := (c.x - x) * (c.x - x) + (c.y - z) * (c.y - z)
				if d < best_d:
					best_d = d
					best = c
					if found < 0:
						found = r
	return best


func line_clear(a: Vector2, b: Vector2) -> bool:
	var length := a.distance_to(b)
	var n := maxi(1, ceili(length / 0.08))
	for i in n + 1:
		var t := float(i) / n
		var p := a.lerp(b, t)
		if not walkable(p.x, p.y):
			return false
	return true


## Waypoints from `from` (exclusive) to `to`, or null. Snaps blocked endpoints. May return [] (already there).
func find_path(from: Vector2, to: Vector2) -> Variant:
	var s: Variant = nearest_walkable(from.x, from.y)
	var g: Variant = nearest_walkable(to.x, to.y)
	if s == null or g == null:
		return null
	if line_clear(from, g) and walkable(from.x, from.y):
		return [g]
	var si := cell_z(s.y) * nx + cell_x(s.x)
	var gi := cell_z(g.y) * nx + cell_x(g.x)
	var total := nx * nz
	var g_score := PackedFloat32Array()
	g_score.resize(total)
	g_score.fill(INF)
	var came := PackedInt32Array()
	came.resize(total)
	came.fill(-1)
	var closed := PackedByteArray()
	closed.resize(total)
	var gx := gi % nx
	var gz := gi / nx
	# binary min-heap held in two parallel arrays
	var hf := PackedFloat32Array()
	var hi := PackedInt32Array()
	g_score[si] = 0.0
	_push(hf, hi, _h(si, gx, gz), si)
	while hf.size() > 0:
		var cur := hi[0]
		_pop(hf, hi)
		if closed[cur] != 0:
			continue
		closed[cur] = 1
		if cur == gi:
			break
		var cx := cur % nx
		var cz := cur / nx
		for dz in range(-1, 2):
			for dx in range(-1, 2):
				if dx == 0 and dz == 0:
					continue
				var ix := cx + dx
				var iz := cz + dz
				if not _ok(ix, iz):
					continue
				if dx != 0 and dz != 0 and (not _ok(cx + dx, cz) or not _ok(cx, cz + dz)):
					continue  # no corner cutting
				var ni := iz * nx + ix
				var ng := g_score[cur] + (1.4142 if (dx != 0 and dz != 0) else 1.0)
				if ng < g_score[ni]:
					g_score[ni] = ng
					came[ni] = cur
					_push(hf, hi, ng + _h(ni, gx, gz), ni)
	if came[gi] < 0 and gi != si:
		return null
	var cells: Array[Vector2] = []
	var i := gi
	while i != -1:
		cells.append(center(i % nx, i / nx))
		i = came[i]
	cells.reverse()
	# string-pull: drop waypoints that have a clear straight line
	var pts: Array[Vector2] = [from]
	for k in range(1, cells.size()):
		pts.append(cells[k])
	pts[pts.size() - 1] = g
	var out: Array = []
	var a := 0
	while a < pts.size() - 1:
		var b := pts.size() - 1
		while b > a + 1 and not line_clear(pts[a], pts[b]):
			b -= 1
		out.append(pts[b])
		a = b
	return out


func _ok(ix: int, iz: int) -> bool:
	return inside(ix, iz) and blocked[iz * nx + ix] == 0


func _h(i: int, gx: int, gz: int) -> float:
	var dx := absi((i % nx) - gx)
	var dz := absi((i / nx) - gz)
	return maxi(dx, dz) + 0.4142 * mini(dx, dz)


static func _push(hf: PackedFloat32Array, hi: PackedInt32Array, f: float, idx: int) -> void:
	hf.append(f)
	hi.append(idx)
	var k := hf.size() - 1
	while k > 0:
		var p := (k - 1) >> 1
		if hf[p] <= hf[k]:
			break
		var tf := hf[p]; hf[p] = hf[k]; hf[k] = tf
		var ti := hi[p]; hi[p] = hi[k]; hi[k] = ti
		k = p


static func _pop(hf: PackedFloat32Array, hi: PackedInt32Array) -> void:
	var last := hf.size() - 1
	hf[0] = hf[last]
	hi[0] = hi[last]
	hf.resize(last)
	hi.resize(last)
	var n := last
	var k := 0
	while true:
		var l := 2 * k + 1
		var r := l + 1
		var m := k
		if l < n and hf[l] < hf[m]:
			m = l
		if r < n and hf[r] < hf[m]:
			m = r
		if m == k:
			break
		var tf := hf[m]; hf[m] = hf[k]; hf[k] = tf
		var ti := hi[m]; hi[m] = hi[k]; hi[k] = ti
		k = m


static func build(house: Dictionary, furniture: Dictionary) -> NavGrid:
	var nav := NavGrid.new(house.bounds)
	var room: Dictionary = house.room
	var x0r: float = room.x0
	var x1r: float = room.x1
	var z0r: float = room.z0
	var z1r: float = room.z1
	var t := 0.11
	var obbs: Array = []
	var rect := func(xa: float, xb: float, za: float, zb: float) -> void:
		obbs.append({"x": (xa + xb) / 2, "z": (za + zb) / 2, "rot": 0.0, "hw": (xb - xa) / 2, "hd": (zb - za) / 2})
	rect.call(x0r - t, x1r + t, z0r - t, z0r + t)  # back wall
	rect.call(x0r - t, x1r + t, z1r - t, z1r + t)  # front kerb
	rect.call(x1r - t, x1r + t, z0r - t, z1r + t)  # right kerb
	var doors: Array = house.openings.filter(func(o): return o.wall == "left" and float(o.bottom) == 0.0)
	doors.sort_custom(func(a, b): return a.center < b.center)
	var cur := z0r - t
	for d in doors:
		rect.call(x0r - t, x0r + t, cur, float(d.center) - float(d.width) / 2)
		cur = float(d.center) + float(d.width) / 2
	rect.call(x0r - t, x0r + t, cur, z1r + t)
	for it in house.items:
		var def: Dictionary = furniture[it.def]
		if def.get("floorDecor", false) or def.get("wallMounted", false):
			continue
		obbs.append({"x": it.x, "z": it.z, "rot": it.get("rot", 0.0),
			"hw": float(def.footprint[0]) / 2, "hd": float(def.footprint[1]) / 2})
	var circles: Array = house.scenery.filter(func(s): return float(s.r) > 0.0)
	nav.rasterize(obbs, circles, 0.2)
	return nav
