class_name FacialHair
extends RefCounted
## Beards, moustaches and sideburns as smooth single meshes (no stacked primitives). A beard is a shell that follows the
## lower head ellipsoid from a top edge down to a hanging end, both shaped per azimuth; moustaches are tapered tubes
## laid on the face. Ported from src/render/facialhair.js.


static func _beard_shell(o: Dictionary) -> ArrayMesh:
	var rx: float = o.rx; var ry: float = o.ry; var rz: float = o.rz
	var az_c: float = o.get("azC", 0.0)
	var az_half: float = o.get("azHalf", 1.7)
	var y_top: Callable = o.yTop
	var y_end: Callable = o.yEnd
	var thick: Callable = o.thick
	var groove: Variant = o.get("groove", null)
	var groove_amp: float = o.get("grooveAmp", 0.005)
	var s_hang: float = o.get("sHang", 0.6)
	var tip_taper: float = o.get("tipTaper", 0.5)
	var rows: int = o.get("rows", 30)
	var cols: int = o.get("cols", 64)
	var base := Geo.hex_to_lin(o.color)
	var cy := 0.0
	var s_min := sqrt(1.0 - 0.97 * 0.97)
	var pos := PackedVector3Array()
	var colors := PackedColorArray()
	for i in rows + 1:
		var u := float(i) / rows
		for j in cols + 1:
			var loc := -az_half + (2.0 * az_half * j) / cols
			var az := az_c + loc
			var aa := absf(loc)
			var yt: float = y_top.call(loc)
			var ye := minf(y_end.call(loc), yt)
			var y := yt + (ye - yt) * u
			var q := (y - cy) / ry
			var sa := sin(az); var ca := cos(az)
			var s: float
			var nx: float; var ny: float; var nz: float
			if q > -0.97:
				s = sqrt(maxf(0.0, 1.0 - q * q))
				nx = s * sa / (rx * rx); ny = q / ry; nz = s * ca / (rz * rz)
			else:  # hanging below the chin: widens into the beard's body, then narrows to the tip
				var d := -0.97 * ry - (y - cy)
				s = s_min + (s_hang - s_min) * Geo.ss(d, 0.0, 0.07)
				nx = sa / rx; ny = -0.15; nz = ca / rz
			s *= 1.0 - tip_taper * pow(Geo.ss(u, 0.45, 1.0), 1.5)
			var nl := sqrt(nx * nx + ny * ny + nz * nz)
			if nl == 0.0:
				nl = 1.0
			var t: float = thick.call(loc, u) * (0.25 + 0.75 * Geo.ss(u, 0.0, 0.18)) * (1.0 - 0.8 * Geo.ss(u, 0.88, 1.0)) \
				* (1.0 - Geo.ss(aa, az_half - 0.3, az_half)) + 0.002
			if ye >= yt - 0.002:
				t = -0.03  # nothing here: sink the open edge into the skin
			var g := 0.0
			if groove != null and t > 0.004:
				g = (groove as Callable).call(loc, u)
			t += g
			pos.append(Vector3(rx * s * sa + nx / nl * t, y + ny / nl * t, rz * s * ca + nz / nl * t))
			var sh := 1.0
			if groove != null:
				sh = 0.86 + 0.14 * clampf((g / groove_amp) * 0.5 + 0.5, 0.0, 1.0) - 0.06 * u
			colors.append(Color(base.r * sh, base.g * sh, base.b * sh))
	var idx := PackedInt32Array()
	var W := cols + 1
	for i in rows:
		for j in cols:
			var a := i * W + j
			var b := a + 1
			var c := a + W
			var d2 := c + 1
			idx.append(a); idx.append(b); idx.append(c)
			idx.append(b); idx.append(d2); idx.append(c)
	return Geo.build(pos, idx, colors, null)


static func _groove(f: float, a: float) -> Callable:
	return func(az: float, u: float) -> float: return a * cos(f * az) * (1.0 - 0.5 * u)


## `z_at` maps (x, y) on the face to the surface z (see Face.z_at).
static func build(head: Node3D, L: Dictionary, z_at: Callable) -> void:
	var fh: String = L.get("facial", "none")
	if fh == "none" or fh == "":
		return
	var fc: int = L.get("facialColor", L.hair)
	var hw: float = L.headW
	var hh: float = L.headH
	var base := {"rx": 0.2 * hw, "ry": 0.2 * hh, "rz": 0.2, "color": fc}
	var parts: Array = []

	var merged := func(extra: Dictionary) -> Dictionary:
		var d := base.duplicate()
		d.merge(extra, true)
		return d

	if fh == "full":
		var top := Hair.prof([[0, -0.123], [0.2, -0.123], [0.42, -0.09], [0.75, -0.04], [1.1, 0.01], [1.5, 0.07], [1.7, 0.07]])
		var end := Hair.prof([[0, -0.29], [0.6, -0.27], [1.0, -0.2], [1.4, -0.09], [1.7, 0.0]])
		parts.append(_beard_shell(merged.call({"yTop": top,
			"yEnd": func(a: float) -> float: return end.call(a) - 0.02 * Hair.tips(a, 5.0) * (1.0 - Geo.ss(absf(a), 0.8, 1.3)),
			"thick": func(a: float, u: float) -> float: return 0.026 + 0.03 * 4.0 * u * (1.0 - u) * (1.0 - Geo.ss(absf(a), 0.7, 1.4)),
			"groove": _groove(10.0, 0.005), "sHang": 0.5, "tipTaper": 0.3})))
	if fh == "long":
		var top2 := Hair.prof([[0, -0.123], [0.2, -0.123], [0.42, -0.09], [0.75, -0.04], [1.1, 0.01], [1.5, 0.07], [1.7, 0.07]])
		var end2 := Hair.prof([[0, -0.66], [0.4, -0.6], [0.8, -0.4], [1.1, -0.2], [1.5, -0.08], [1.7, 0.0]])
		parts.append(_beard_shell(merged.call({"yTop": top2,
			"yEnd": func(a: float) -> float: return end2.call(a) - 0.05 * Hair.tips(a, 5.0) * (1.0 - Geo.ss(absf(a), 0.7, 1.2)),
			"thick": func(a: float, u: float) -> float: return 0.026 + 0.04 * sin(minf(1.0, u * 1.6) * PI * 0.9) * (1.0 - Geo.ss(absf(a), 0.7, 1.4)),
			"groove": _groove(9.0, 0.007), "grooveAmp": 0.007, "sHang": 0.46, "tipTaper": 0.6, "rows": 44})))
	if fh == "goatee":
		var top3 := Hair.prof([[0, -0.15], [0.35, -0.13], [0.55, -0.1]])
		var end3 := Hair.prof([[0, -0.33], [0.3, -0.27], [0.55, -0.2]])
		parts.append(_beard_shell(merged.call({"azHalf": 0.55, "yTop": top3,
			"yEnd": func(a: float) -> float: return end3.call(a) - 0.03 * Hair.tips(a, 4.0),
			"thick": func(_a: float, u: float) -> float: return 0.028 + 0.03 * 4.0 * u * (1.0 - u), "sHang": 0.42, "tipTaper": 0.5})))
	if fh == "sideburns" or fh == "mutton":
		var mutton := fh == "mutton"
		for s in [-1.0, 1.0]:
			parts.append(_beard_shell(merged.call({"azC": s * 1.45, "azHalf": 0.5 if mutton else 0.3,
				"yTop": func(_a: float) -> float: return 0.1,
				"yEnd": func(a: float) -> float: return (-0.12 if mutton else -0.05) - (0.03 if mutton else 0.015) * Hair.tips(a, 4.0),
				"thick": func(_a: float, u: float) -> float: return 0.026 + (0.014 if mutton else 0.006) * 4.0 * u * (1.0 - u),
				"groove": _groove(14.0, 0.004), "grooveAmp": 0.004, "sHang": 0.5, "tipTaper": 0.3})))

	# moustaches: tapered tubes laid on the face from the centre outwards
	var stache := ""
	if fh == "curly":
		stache = "curly"
	elif fh == "mustache" or fh == "full" or fh == "long":
		stache = "plain"
	if stache != "":
		for s in [-1.0, 1.0]:
			var raw: Array = [[0.0, -0.074], [0.034, -0.09], [0.075, -0.088], [0.106, -0.066], [0.1, -0.04], [0.082, -0.036]] if stache == "curly" \
				else [[0.0, -0.075], [0.03, -0.088], [0.066, -0.087], [0.096, -0.074]]
			var pts: Array = []
			for p in raw:
				pts.append(Vector3(s * p[0], p[1], z_at.call(p[0], p[1]) + 0.016))
			parts.append(Geo.tube(pts, 0.026, 0.008 if stache == "curly" else 0.011, fc, 0.0, 0.0, 10, 22))
	for g in parts:
		var mi := MeshInstance3D.new()
		mi.mesh = g
		mi.material_override = Hair.material()
		head.add_child(mi)
