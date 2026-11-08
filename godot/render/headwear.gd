class_name Headwear
extends RefCounted
## Hats, hoods and kerchiefs as single smooth meshes (a shell around the skull, or a lathe for brimmed hats).
## Ported from src/render/headwear.js.


static func _lathe_hat(pts: Array, color: int, band_color: int = -1, band_y: Array = [0.0, 0.0], bend: float = 0.0, seg: int = 40) -> ArrayMesh:
	var top := -INF
	var bottom := INF
	for p in pts:
		top = maxf(top, p[1])
		bottom = minf(bottom, p[1])
	var np := pts.size()
	var pos := PackedVector3Array()
	var cols := PackedColorArray()
	var base := Geo.hex_to_lin(color)
	var bc := Geo.hex_to_lin(band_color) if band_color >= 0 else Color.BLACK
	for i in seg + 1:
		var phi := TAU * float(i) / seg
		for j in np:
			var r: float = pts[j][0]
			var y: float = pts[j][1]
			var t := maxf(0.0, (y - bottom - 0.12) / (top - bottom))   # lean the crown backwards (wizard hat)
			pos.append(Vector3(r * sin(phi), y, r * cos(phi) - bend * t * t))
			var in_band: bool = band_color >= 0 and y >= band_y[0] and y <= band_y[1]
			cols.append(bc if in_band else base)
	var idx := PackedInt32Array()
	for i in seg:
		for j in np - 1:
			var a := i * np + j
			var b := (i + 1) * np + j
			var c := a + 1
			var d := b + 1
			idx.append(a); idx.append(c); idx.append(b)
			idx.append(b); idx.append(c); idx.append(d)
	var merge: Array = []
	for j in np:
		merge.append(Vector2i(j, seg * np + j))
	return Geo.build(pos, idx, cols, null, merge)


static func build(head: Node3D, L: Dictionary) -> void:
	var k: String = L.get("headwear", "") if L.get("headwear") != null else ""
	var col: int = L.get("headwearColor", Pal.LINEN)
	var hw: float = L.headW
	var hh: float = L.headH
	if k == "" or k == "circlet":
		return
	if k == "helm":
		col = 0xaeb6c2
	var base := {"rx": 0.205 * hw, "ry": 0.205 * hh, "rz": 0.205, "cy": 0.0, "color": col}
	var parts: Array = []
	var add := func(geo: ArrayMesh, p: Vector3 = Vector3.ZERO) -> void: parts.append({"mesh": geo, "pos": p})
	var sh := func(o: Dictionary) -> void:
		var d := base.duplicate()
		d.merge(o, true)
		parts.append({"mesh": Hair.shell(d), "pos": Vector3.ZERO})
	var bang_w := func(az: float) -> float: return 1.0 - Geo.ss(absf(az), 0.8, 1.5)

	if k == "helm":  # open-faced steel helmet: domed cap, back/neck guard, central ridge and a brow band
		var ridge := func(az: float, u: float) -> float:
			return 0.03 * (1.0 - Geo.ss(minf(absf(az), PI - absf(az)), 0.0, 0.22)) * (1.0 - Geo.ss(u, 0.0, 0.7))
		sh.call({"yEnd": Hair.prof([[0, 0.085], [0.8, 0.07], [1.3, -0.04], [1.8, -0.15], [PI, -0.2]]),
			"thick": func(az: float, u: float) -> float: return 0.032 + ridge.call(az, u) + 0.008 * (1.0 - u), "flare": 0.1})
		sh.call({"yEnd": Hair.prof([[0, 0.085], [0.8, 0.07], [1.3, 0.04], [1.8, 0.04], [PI, 0.04]]), "el0": 1.0,
			"thick": func(_az: float, _u: float) -> float: return 0.048, "color": 0xd9b25a, "rows": 6})  # brow band
	if k == "coif":
		sh.call({"yEnd": Hair.prof([[0, 0.12], [0.7, 0.1], [1.2, -0.03], [1.7, -0.13], [2.4, -0.13], [PI, -0.1]]),
			"thick": func(_az: float, u: float) -> float: return 0.036 + 0.01 * (1.0 - u), "flare": 0.04})
	if k == "kerchief":
		sh.call({"yEnd": Hair.prof([[0, 0.1], [0.9, 0.04], [1.4, -0.03], [2.0, -0.08], [PI, -0.1]]),
			"thick": func(_az: float, u: float) -> float: return 0.036 + 0.012 * (1.0 - u)})
		add.call(Hair.blob(0.055, col, 1.15, 0.9, 1.0), Vector3(0, -0.07, -0.27))
		for s in [-1.0, 1.0]:
			add.call(Geo.tube([Vector3(s * 0.025, -0.09, -0.28), Vector3(s * 0.06, -0.2, -0.3), Vector3(s * 0.09, -0.3, -0.29)], 0.034, 0.012, col, 0.0, 0.0, 8))
	if k == "hood":
		sh.call({"yEnd": Hair.prof([[0, 0.1], [0.85, 0.03], [1.25, -0.14], [1.75, -0.22], [PI, -0.25]]),
			"thick": func(_az: float, u: float) -> float: return 0.05 + 0.02 * u, "flare": 0.3, "curl": 0.12})
		add.call(Geo.tube([Vector3(0, 0.0, -0.27), Vector3(0, -0.2, -0.33), Vector3(0, -0.42, -0.34), Vector3(0, -0.58, -0.3)], 0.065, 0.014, col, 0.0, 0.0, 10))  # liripipe tail
	if k == "flatcap":
		sh.call({"yEnd": Hair.prof([[0, 0.075], [0.7, 0.085], [1.4, 0.04], [2.0, 0.03], [PI, 0.01]]),
			"thick": func(az: float, u: float) -> float: return 0.04 + 0.03 * (1.0 - u) + 0.04 * bang_w.call(az) * Geo.ss(u, 0.5, 1.0)})
	if k == "strawhat":
		add.call(_lathe_hat([[0, 0.34], [0.09, 0.335], [0.17, 0.31], [0.215, 0.24], [0.2255, 0.2], [0.2285, 0.17], [0.23, 0.135], [0.232, 0.1], [0.31, 0.088], [0.4, 0.082], [0.47, 0.09], [0.455, 0.1], [0.38, 0.107], [0.3, 0.112], [0.22, 0.125], [0, 0.18]],
			0xe3c46c, col, [0.131, 0.205]))
	if k == "pointed":
		add.call(_lathe_hat([[0, 0.95], [0.012, 0.9], [0.04, 0.7], [0.09, 0.48], [0.15, 0.3], [0.215, 0.17], [0.26, 0.11], [0.34, 0.1], [0.36, 0.115], [0.3, 0.125], [0.22, 0.14], [0, 0.2]],
			col, 0xd9b25a, [0.12, 0.17], 0.28))
	if k == "bakerhat":
		add.call(_lathe_hat([[0, 0.5], [0.15, 0.48], [0.25, 0.43], [0.285, 0.35], [0.27, 0.27], [0.23, 0.2], [0.222, 0.1], [0.215, 0.04], [0, 0.04]], col))

	for e in parts:
		var mi := MeshInstance3D.new()
		mi.mesh = e.mesh
		mi.material_override = Hair.material()
		mi.position = e.pos
		head.add_child(mi)
