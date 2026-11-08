class_name FacePaint
extends Node2D
## Paints the face texture (eyes, brows, mouth, blush, freckles) in "physical face units" (y up) exactly like the
## canvas painter in src/render/face.js; the transform maps them to the texture. Rendered once by FaceBaker.

var L: Dictionary
var W := 512
var H := 320
var _skin := Color.WHITE


static func _col(hex: int) -> Color:
	return GameData.col(hex)


func _ell(cx: float, cy: float, rx: float, ry: float, col: Color, rot: float = 0.0) -> void:
	var pts := PackedVector2Array()
	var n := 28
	var cr := cos(rot)
	var sr := sin(rot)
	for i in n:
		var a := TAU * i / n
		var px := rx * cos(a)
		var py := ry * sin(a)
		pts.append(Vector2(cx + px * cr - py * sr, cy + px * sr + py * cr))
	draw_colored_polygon(pts, col)


func _poly_line(pts: PackedVector2Array, w: float, col: Color) -> void:
	draw_polyline(pts, col, w, true)
	draw_circle(pts[0], w / 2.0, col)
	draw_circle(pts[pts.size() - 1], w / 2.0, col)


func _line(a: Vector2, b: Vector2, w: float, col: Color) -> void:
	_poly_line(PackedVector2Array([a, b]), w, col)


func _quad(p0: Vector2, c: Vector2, p1: Vector2, steps: int = 14) -> PackedVector2Array:
	var pts := PackedVector2Array()
	for i in steps + 1:
		var t := float(i) / steps
		pts.append(p0 * (1 - t) * (1 - t) + c * 2.0 * (1 - t) * t + p1 * t * t)
	return pts


func _arc(cx: float, cy: float, rx: float, ry: float, a0: float, a1: float, rot: float = 0.0, steps: int = 20) -> PackedVector2Array:
	var pts := PackedVector2Array()
	var cr := cos(rot)
	var sr := sin(rot)
	for i in steps + 1:
		var a := a0 + (a1 - a0) * float(i) / steps
		var px := rx * cos(a)
		var py := ry * sin(a)
		pts.append(Vector2(cx + px * cr - py * sr, cy + px * sr + py * cr))
	return pts


## Soft radial blob (blush, nose shading): a few stacked translucent ellipses.
func _soft(cx: float, cy: float, rx: float, ry: float, col: Color, alpha: float) -> void:
	var rings := 8
	for k in range(rings, 0, -1):
		var s := float(k) / rings
		var c := Color(col.r, col.g, col.b, alpha * 0.17)
		_ell(cx, cy, rx * s, ry * s, c)


func _clip_y_ge(poly: PackedVector2Array, y0: float) -> PackedVector2Array:
	var out := PackedVector2Array()
	var n := poly.size()
	for i in n:
		var a := poly[i]
		var b := poly[(i + 1) % n]
		var ain := a.y >= y0
		var bin := b.y >= y0
		if ain:
			out.append(a)
		if ain != bin:
			var t := (y0 - a.y) / (b.y - a.y)
			out.append(a + (b - a) * t)
	return out


func _draw() -> void:
	var R := Face.HEAD_R
	var hw: float = L.headW
	var hh: float = L.headH
	_skin = _col(L.skin)
	draw_rect(Rect2(0, 0, W, H), _skin)
	var kx := W / (PI * R * hw)
	var ky := H / (PI * R * hh)
	draw_set_transform_matrix(Transform2D(Vector2(kx, 0), Vector2(0, -ky), Vector2(W * 0.5, H * 0.5)))
	var ink := Color8(0x2a, 0x20, 0x24)
	var lip := _col(Geo.mix_hex(L.skin, 0x9a3a3a, 0.62))
	var skin_dark := _col(Geo.mix_hex(L.skin, 0x5a2a20, 0.3))
	var brow_hex: int = L.browColor if L.get("browColor") != null else L.hair
	var brow := _col(Geo.lin_to_hex(Geo.hex_to_lin(brow_hex).lerp(Color.BLACK, 0.1)))
	var acc: Array = L.get("accessories", [])

	# cheeks and nose shading first (under the features)
	if L.get("blush", true):
		for s in [-1.0, 1.0]:
			_soft(s * 0.122 * hw, -0.05, 0.05, 0.034, Color8(0xf0, 0x8a, 0x84), 0.7)
	if L.nose == "button":
		_soft(0, -0.052, 0.026, 0.018, _col(Geo.mix_hex(L.skin, 0x7a3a2a, 0.45)), 0.53)
	for i in int(L.get("freckles", 0)):
		var s := 1.0 if i % 2 == 1 else -1.0
		var k := i / 2
		_ell(s * (0.05 + (k % 3) * 0.027), -0.025 - ((k * 7) % 3) * 0.016 + (-0.022 if k > 2 else 0.0), 0.0085, 0.0085, skin_dark)

	# eyes + brows
	var ex: float = L.eyeGap
	var ey: float = 0.02 + float(L.eyeY)
	var es: float = L.eyeSize
	var eye: String = L.eyes
	var ic := _col(L.eyeColor)
	var tilt: float = L.get("eyeTilt", 0.0)
	for s in [-1.0, 1.0]:
		var cx: float = s * ex
		# upturned (+) or droopy (-) outer corners: rotate the eye about its centre
		var rot: float = s * tilt * 0.3
		var xf := Transform2D(rot, Vector2.ZERO)
		var o := Vector2(cx, ey)
		var T := func(v: Vector2) -> Vector2: return o + xf * (v - o)
		var hl := func(px: float, py: float, r: float) -> void:
			var c: Vector2 = T.call(Vector2(cx + px, ey + py))
			_ell(c.x, c.y, r, r, Color.WHITE)
		var E := func(x: float, y: float, rx: float, ry: float, col: Color) -> void:
			var c: Vector2 = T.call(Vector2(x, y))
			_ell(c.x, c.y, rx, ry, col, rot)
		if eye == "dot":
			E.call(cx, ey, 0.026 * es, 0.036 * es, ink)
			hl.call(0.008 * es, 0.014 * es, 0.009 * es)
		elif eye == "big":
			E.call(cx, ey, 0.042 * es, 0.054 * es, Color8(0xff, 0xfa, 0xf0))
			E.call(cx, ey - 0.002, 0.036 * es, 0.047 * es, ic)
			E.call(cx, ey - 0.006 * es, 0.021 * es, 0.03 * es, ink)
			hl.call(0.011 * es, 0.017 * es, 0.0115 * es)
			hl.call(-0.01 * es, -0.014 * es, 0.0055 * es)
			var pts := _arc(cx, ey, 0.043 * es, 0.055 * es, 0.15 * PI, 0.85 * PI)
			_poly_line(_xf_pts(pts, o, xf), 0.007, ink)
		elif eye == "wide":
			E.call(cx, ey, 0.05 * es, 0.04 * es, Color8(0xff, 0xfa, 0xf0))
			E.call(cx, ey, 0.027 * es, 0.034 * es, ic)
			E.call(cx, ey, 0.015 * es, 0.02 * es, ink)
			hl.call(0.008 * es, 0.01 * es, 0.0085 * es)
			_poly_line(_xf_pts(_arc(cx, ey, 0.051 * es, 0.041 * es, 0.1 * PI, 0.9 * PI), o, xf), 0.006, ink)
		elif eye == "sleepy":
			E.call(cx, ey - 0.004, 0.03 * es, 0.026 * es, ink)
			var lid := PackedVector2Array([Vector2(cx - 0.04, ey + 0.004), Vector2(cx + 0.04, ey + 0.004), Vector2(cx + 0.04, ey + 0.044), Vector2(cx - 0.04, ey + 0.044)])
			draw_colored_polygon(_xf_pts(lid, o, xf), _skin)  # flat upper lid cuts the dot
			hl.call(0.007 * es, -0.005, 0.0055 * es)
			_poly_line(_xf_pts(PackedVector2Array([Vector2(cx - 0.036 * es, ey + 0.004), Vector2(cx + 0.036 * es, ey + 0.004)]), o, xf), 0.009, ink)
		elif eye == "closed":
			_poly_line(_xf_pts(_arc(cx, ey + 0.012, 0.03 * es, 0.018 * es, 1.08 * PI, 1.92 * PI), o, xf), 0.011, ink)
		elif eye == "narrow":
			_poly_line(_xf_pts(PackedVector2Array([Vector2(cx - 0.036 * es, ey + s * 0.004), Vector2(cx + 0.036 * es, ey - s * 0.004)]), o, xf), 0.014, ink)
		elif eye == "happy":
			_poly_line(_xf_pts(_arc(cx, ey - 0.012, 0.03 * es, 0.026 * es, 0.05 * PI, 0.95 * PI), o, xf), 0.013, ink)
		# brows
		var by: float = ey + 0.062 * (1.2 if es > 1.1 else 1.0)
		var bs: String = L.brows
		var bk := func(w: float, th: float, tl: float) -> void:
			var xr := Transform2D(tl, Vector2(cx, by))
			_line(xr * Vector2(-w / 2.0, 0), xr * Vector2(w / 2.0, 0), th, brow)
		if bs == "thin": bk.call(0.066, 0.011, 0.0)
		if bs == "thick": bk.call(0.08, 0.022, 0.0)
		if bs == "bushy": bk.call(0.094, 0.034, s * 0.08)
		if bs == "arched":
			_poly_line(_quad(Vector2(cx - 0.034, by - 0.006), Vector2(cx, by + 0.016), Vector2(cx + 0.034, by - 0.006)), 0.013, brow)
		if bs == "angry": bk.call(0.078, 0.019, s * 0.38)
		if bs == "worried": bk.call(0.068, 0.014, -s * 0.38)

	# mouth
	var my := -0.105
	var m: String = L.mouth
	if m == "smile":
		_poly_line(_quad(Vector2(-0.034, my + 0.008), Vector2(0, my - 0.016), Vector2(0.034, my + 0.008)), 0.0095, lip)
	if m == "flat": _line(Vector2(-0.028, my), Vector2(0.028, my), 0.01, lip)
	if m == "smirk":
		_poly_line(_quad(Vector2(-0.03, my - 0.002), Vector2(0.008, my - 0.008), Vector2(0.038, my + 0.012)), 0.0095, lip)
	if m == "frown":
		_poly_line(_quad(Vector2(-0.032, my - 0.008), Vector2(0, my + 0.014), Vector2(0.032, my - 0.008)), 0.0095, lip)
	if m == "open":
		_ell(0, my - 0.004, 0.03, 0.022, Color8(0x5a, 0x24, 0x28))
		var oval := _arc(0, my - 0.004, 0.03, 0.022, 0.0, TAU, 0.0, 28)
		var teeth := _clip_y_ge(oval, my + 0.004)
		if teeth.size() >= 3:
			draw_colored_polygon(teeth, Color8(0xff, 0xfa, 0xf0))
		_ell(0, my - 0.02, 0.016, 0.01, Color8(0xc9, 0x6a, 0x70))
	if m == "tiny":
		_poly_line(_quad(Vector2(-0.018, my + 0.004), Vector2(0, my - 0.01), Vector2(0.018, my + 0.004)), 0.009, lip)
	if m == "cat":
		_poly_line(_quad(Vector2(-0.034, my + 0.006), Vector2(-0.017, my - 0.016), Vector2(0, my + 0.002)), 0.009, lip)
		_poly_line(_quad(Vector2(0, my + 0.002), Vector2(0.017, my - 0.016), Vector2(0.034, my + 0.006)), 0.009, lip)
	if m == "pout":
		_ell(0, my, 0.02, 0.012, lip)
		_ell(0, my + 0.004, 0.016, 0.004, _col(Geo.mix_hex(L.skin, 0xffffff, 0.35)))
	if m == "o": _ell(0, my, 0.014, 0.018, Color8(0x5a, 0x24, 0x28))
	if m == "grin":
		var upper := _quad(Vector2(-0.045, my + 0.014), Vector2(0, my - 0.022), Vector2(0.045, my + 0.014), 16)
		var lower := _quad(Vector2(0.045, my + 0.014), Vector2(0, my + 0.004), Vector2(-0.045, my + 0.014), 16)
		var shape := PackedVector2Array()
		shape.append_array(upper)
		shape.append_array(lower)
		draw_colored_polygon(shape, Color8(0x5a, 0x24, 0x28))
		var band := _clip_y_ge(shape, my + 0.002)
		if band.size() >= 3:
			draw_colored_polygon(band, Color8(0xff, 0xfa, 0xf0))
		_poly_line(upper, 0.008, lip)

	if acc.has("scar"):
		_line(Vector2(0.09, 0.02), Vector2(0.13, -0.08), 0.007, Color8(0xc7, 0x7a, 0x7a))
		for t in [0.3, 0.55, 0.8]:
			_line(Vector2(0.09 + 0.04 * t - 0.01, 0.02 - 0.1 * t), Vector2(0.09 + 0.04 * t + 0.01, 0.02 - 0.1 * t), 0.003, Color8(0xf0, 0xd0, 0xc8))


func _xf_pts(pts: PackedVector2Array, o: Vector2, xf: Transform2D) -> PackedVector2Array:
	var out := PackedVector2Array()
	for p in pts:
		out.append(o + xf * (p - o))
	return out
