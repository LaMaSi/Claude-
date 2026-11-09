class_name World
extends Node3D
## Builds the diorama: ground out to a misty wooded horizon, timber-and-stone cottage (back walls only, front cut
## away), furniture, scenery, fence, fireflies. Ported from src/render/world.js.

# furniture heights (for tap picking only)
const PICK_HEIGHT := {
	"bed": 1.15, "pantry": 1.9, "hearth": 2.0, "tub": 0.6, "washstand": 1.05, "settle": 0.95, "harp": 1.4,
	"table": 0.9, "stool": 0.5, "plant": 1.1, "candlestand": 1.8, "bookshelf": 1.9, "chest": 0.55, "barrel": 0.8,
	"banner": 1.2, "rug": 0.05,
}

var reg: Dictionary
var items: Array = []          # picking entries: {index, def, x, z, rot, y, hw, hd, h}
var _flies: Array = []
var _fly_root: Node3D


class Lcg:
	var s: int
	func _init(seed_v: int) -> void:
		s = seed_v
	func next() -> float:
		s = (s * 16807) % 2147483647
		return float(s) / 2147483647.0


var item_nodes: Dictionary = {}   # item id -> Node3D (its meshes, flames and lights live under it)


## `p_items` are the simulation's items (each has a stable `index`); defaults to the house's starting layout.
func build(house: Dictionary, p_items: Array = []) -> void:
	var b := Builder.new()
	b.dyn_parent = self
	reg = {"lamp_shades": [], "lamp_lights": [], "flames": [], "fire_lights": [], "window_glass": []}
	var room: Dictionary = house.room
	var x0: float = room.x0; var x1: float = room.x1; var z0: float = room.z0; var z1: float = room.z1
	var wall_h: float = room.wallHeight
	var W := x1 - x0
	var D := z1 - z0

	_ground_and_woods(b, house)
	_path(b)
	_floor(b, x0, x1, z0, z1)

	# walls: back (z0) and left (x0); front sides cut away with a low stone kerb
	var by_wall := func(name: String) -> Array:
		return house.openings.filter(func(o): return o.wall == name)
	_wall(b, "x", z0, x0, x1, wall_h, by_wall.call("back"))
	_wall(b, "z", x0, z0, z1, wall_h, by_wall.call("left"))
	b.box(W + 0.24, 0.3, 0.24, Pal.STONE, (x0 + x1) / 2, 0, z1)
	b.box(W + 0.3, 0.07, 0.3, Pal.STONE_LIGHT, (x0 + x1) / 2, 0.3, z1)
	b.box(0.24, 0.3, D, Pal.STONE, x1, 0, (z0 + z1) / 2)
	b.box(0.3, 0.07, D, Pal.STONE_LIGHT, x1, 0.3, (z0 + z1) / 2)

	# scenery (data-driven so the nav grid and the renderer agree)
	for sc in house.scenery:
		b.push(Vector3(sc.x, 0, sc.z), float(sc.x) if sc.type == "flowers" else 0.0, sc.s)
		Models.build_scenery(b, sc.type)
		b.pop()

	_fence(b)
	b.commit(self)
	for k in b.reg:
		reg[k].append_array(b.reg[k])
	_fireflies(x0, x1, z0, z1)

	# furniture: one node per item, so decorating can move and remove them
	var src: Array = p_items
	if src.is_empty():
		var idx := 0
		for it in house.items:
			var d: Dictionary = it.duplicate()
			d.index = idx
			idx += 1
			src.append(d)
	for it in src:
		add_item_node(it)


func _item_transform(it: Dictionary) -> Transform3D:
	return Transform3D(Basis(Vector3.UP, float(it.get("rot", 0.0))), Vector3(it.x, it.get("y", 0.0), it.z))


func _pick_entry(it: Dictionary) -> Dictionary:
	var def: Dictionary = GameData.furniture[it.def]
	return {"index": it.index, "def": it.def, "x": it.x, "z": it.z, "y": it.get("y", 0.0), "rot": it.get("rot", 0.0),
		"hw": float(def.footprint[0]) / 2.0 + 0.08, "hd": float(def.footprint[1]) / 2.0 + 0.08, "h": PICK_HEIGHT.get(it.def, 1.0)}


func add_item_node(it: Dictionary) -> void:
	var node := Node3D.new()
	node.name = "Item%d" % it.index
	add_child(node)
	var b := Builder.new()
	b.dyn_parent = node      # flames / lights / glass are children, so they move with the item
	Models.build_furniture(b, it.def)
	b.commit(node)
	node.transform = _item_transform(it)
	for k in b.reg:
		reg[k].append_array(b.reg[k])
	node.set_meta("reg", b.reg)
	item_nodes[it.index] = node
	items.append(_pick_entry(it))


func remove_item_node(id: int) -> void:
	if not item_nodes.has(id):
		return
	var node: Node3D = item_nodes[id]
	var own: Dictionary = node.get_meta("reg")
	for k in own:
		for o in own[k]:
			reg[k].erase(o)
	node.queue_free()
	item_nodes.erase(id)
	for i in items.size():
		if items[i].index == id:
			items.remove_at(i)
			break


func move_item_node(it: Dictionary) -> void:
	if not item_nodes.has(it.index):
		return
	(item_nodes[it.index] as Node3D).transform = _item_transform(it)
	for i in items.size():
		if items[i].index == it.index:
			items[i] = _pick_entry(it)
			break


# ---- ground, woods, path, floor ---------------------------------------------------------------------------------
func _ground_and_woods(b: Builder, house: Dictionary) -> void:
	b.shadow = false
	b.box(400, 0.1, 400, Pal.GRASS, 0, -0.14, 0)  # top at y = -0.04
	var g := Lcg.new(11)
	var patch_cols := [0x84b46c, 0x93c078, 0x7fb06a]
	for i in 70:
		var r := 1.2 + g.next() * 3.2
		var px := (g.next() - 0.5) * 70.0
		var pz := (g.next() - 0.5) * 70.0
		b.disc(r, 9, patch_cols[i % 3], px, -0.035 + (i % 3) * 0.002, pz)
	var yard := {"x0": -7.9, "x1": 7.9, "z0": -6.5, "z1": 6.2}
	var n := 0
	while n < 90:
		var x := (g.next() - 0.5) * 80.0
		var z := (g.next() - 0.5) * 80.0
		if x > yard.x0 - 1.3 and x < yard.x1 + 1.3 and z > yard.z0 - 1.3 and z < yard.z1 + 1.3:
			continue
		var k := g.next()
		var s0 := 1.0 + g.next() * 0.9
		var rot := g.next() * 6.0   # (JS draws rotation after kind/scale)
		var scl := s0
		var kind := "tree"
		if k < 0.42:
			kind = "pine"; scl = s0 * 1.2
		elif k < 0.8:
			kind = "tree"
		elif k < 0.92:
			kind = "bush"; scl = s0 * 1.2
		else:
			kind = "rock"
		b.push(Vector3(x, 0, z), rot, scl)
		if kind == "rock":
			b.ball(0.5, Pal.STONE_DARK, 0, 0.2, 0, 0, 0.7)
		else:
			Models.build_scenery(b, kind)
		b.pop()
		n += 1
	b.shadow = true


func _path(b: Builder) -> void:
	var r := Lcg.new(3)
	var cobble := func(x: float, z: float, w: float, d: float) -> void:
		var c: int = Pal.COBBLE if r.next() > 0.5 else Pal.STONE_LIGHT
		b.push(Vector3(x, 0, z), (r.next() - 0.5) * 0.5)
		b.box(w, 0.05, d, c, 0, -0.045, 0)
		b.pop()
	for i in 9:
		for dz in [-0.3, 0.3]:
			var jz := (r.next() - 0.5) * 0.15
			var jw := r.next() * 0.08
			cobble.call(-4.3 - i * 0.42, 2.2 + dz + jz, 0.36 + jw, 0.5)
	for j in 8:
		for dx in [-0.3, 0.3]:
			var jx := (r.next() - 0.5) * 0.1
			var jd := r.next() * 0.08
			cobble.call(-7.0 + dx + jx, 2.5 + j * 0.46, 0.5, 0.38 + jd)


func _flag_texture() -> ImageTexture:
	var size := 256
	var img := Image.create(size, size, true, Image.FORMAT_RGB8)
	img.fill(Color8(0x8a, 0x82, 0x72))
	var cols := [Color8(0xb9, 0xb0, 0xa0), Color8(0xa5, 0x9d, 0x8d), Color8(0xc4, 0xbc, 0xab), Color8(0xb0, 0xa8, 0x98), Color8(0x9d, 0x95, 0x85)]
	var rn := Lcg.new(7)
	var rows := 6
	var h := float(size) / rows
	for row in rows:
		var u := -rn.next() * 40.0
		while u < size:
			var w := 35.0 + rn.next() * 35.0
			var c: Color = cols[int(floor(rn.next() * cols.size()))]
			var rx := int(u + 1.5); var ry := int(row * h + 1.5)
			var rw := int(w - 3.0); var rh := int(h - 3.0)
			# clip to the tile so the pattern wraps cleanly enough, trim corners for a rounded look
			var rect := Rect2i(rx, ry, rw, rh).intersection(Rect2i(0, 0, size, size))
			if rect.size.x > 2 and rect.size.y > 2:
				img.fill_rect(rect, c)
				for corner in [rect.position, rect.position + Vector2i(rect.size.x - 1, 0), rect.position + Vector2i(0, rect.size.y - 1), rect.end - Vector2i(1, 1)]:
					img.set_pixelv(corner, Color8(0x8a, 0x82, 0x72))
			u += w
	img.generate_mipmaps()
	return ImageTexture.create_from_image(img)


func _floor(b: Builder, x0: float, x1: float, z0: float, z1: float) -> void:
	var W := x1 - x0
	var D := z1 - z0
	b.box(W + 0.24, 0.2, D + 0.24, Pal.STONE_DARK, (x0 + x1) / 2, -0.21, (z0 + z1) / 2)
	var plane := PlaneMesh.new()
	plane.size = Vector2(W + 0.24, D + 0.24)
	var m := StandardMaterial3D.new()
	m.albedo_texture = _flag_texture()
	m.uv1_scale = Vector3(W / 4.0, D / 4.0, 1)
	m.texture_repeat = true
	m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
	m.roughness = 0.95
	var mi := MeshInstance3D.new()
	mi.mesh = plane
	mi.material_override = m
	mi.position = Vector3((x0 + x1) / 2, -0.005, (z0 + z1) / 2)
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(mi)


# ---- walls ------------------------------------------------------------------------------------------------------
## A wall built in a local frame (u along the wall, local z = thickness). Stone base to 0.9, plaster above,
## exposed timber framing, shuttered windows and an open plank door.
func _wall(b: Builder, axis: String, fixed: float, from: float, to: float, H_in: float, openings: Array, thick: float = 0.24) -> void:
	var H := H_in
	if axis == "z":
		H -= 0.03  # corner overlap: the two walls' tops are never coplanar
	if axis == "x":
		b.push(Vector3(0, 0, fixed))
	else:
		b.push(Vector3(fixed, 0, 0), -PI / 2)
	var inside := 1.0 if axis == "x" else -1.0
	var ops: Array = openings.duplicate()
	ops.sort_custom(func(a, c): return a.center < c.center)
	var STONE_H := 0.9
	var pieces: Array = []
	var cur := from
	for o in ops:
		var a: float = float(o.center) - float(o.width) / 2.0
		var bb: float = float(o.center) + float(o.width) / 2.0
		pieces.append([cur, a, 0.0, H])
		if float(o.bottom) > 0.0:
			pieces.append([a, bb, 0.0, float(o.bottom)])
		pieces.append([a, bb, float(o.top), H])
		cur = bb
	pieces.append([cur, to, 0.0, H])
	var TOP := H - 0.08
	var add := func(a: float, c: float, y0: float, y1: float, color: int) -> void:
		if c - a < 0.01 or y1 - y0 < 0.01:
			return
		b.box(c - a, minf(y1, TOP) - y0, thick, color, (a + c) / 2, y0, 0)
	for p in pieces:
		var a0: float = p[0]; var c: float = p[1]; var y0: float = p[2]; var y1: float = p[3]
		var a := a0 - thick / 2.0 if is_equal_approx(a0, from) else a0
		if y1 <= STONE_H:
			add.call(a, c, y0, y1, Pal.STONE)
		elif y0 >= STONE_H:
			add.call(a, c, y0, y1, Pal.PLASTER)
		else:
			add.call(a, c, y0, STONE_H, Pal.STONE)
			add.call(a, c, STONE_H, y1, Pal.PLASTER)
	# timber: top plate, sill beam, posts, braces
	b.box(to - from + thick + 0.1, 0.16, thick + 0.1, Pal.TIMBER, (from + to) / 2, H - 0.16, 0)
	b.box(to - from + thick, 0.12, thick + 0.06, Pal.TIMBER, (from + to) / 2, STONE_H - 0.06, 0)
	var posts: Array = [from - thick / 2.0 + 0.07, to]
	for o in ops:
		posts.append(float(o.center) - float(o.width) / 2.0 - 0.05)
		posts.append(float(o.center) + float(o.width) / 2.0 + 0.05)
	posts.sort()
	for u in posts:
		b.box(0.14, H - STONE_H - 0.1, thick + 0.07, Pal.TIMBER, u, STONE_H, 0)
	for i in posts.size() - 1:
		var a: float = posts[i] + 0.07
		var c: float = posts[i + 1] - 0.07
		var length := c - a
		var has_opening := false
		for o in ops:
			if float(o.center) > a and float(o.center) < c:
				has_opening = true
		if has_opening or length < 0.9:
			continue
		var hh := H - STONE_H - 0.26
		var ang := atan2(hh, length)
		var dl := sqrt(length * length + hh * hh)
		b.box(dl, 0.1, thick + 0.05, Pal.TIMBER, (a + c) / 2, STONE_H + 0.13 + hh / 2 - 0.05, 0, 0.0,
			Vector3(0, 0, ang * (1.0 if i % 2 == 1 else -1.0)))
	# windows and the door
	for o in ops:
		var w: float = o.width; var cx: float = o.center
		var hgt: float = float(o.top) - float(o.bottom)
		var cy: float = (float(o.top) + float(o.bottom)) / 2.0
		if float(o.bottom) > 0.0:
			var gm := StandardMaterial3D.new()
			gm.albedo_color = Color(0xcf / 255.0, 0xe8 / 255.0, 0xef / 255.0, 0.3)
			gm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			gm.roughness = 0.1
			gm.emission_enabled = true
			gm.emission = GameData.col(0xffc678)
			gm.emission_energy_multiplier = 0.0
			var glass := b.dynamic_box(w, hgt, 0.03, gm, cx, float(o.bottom), 0)
			b.reg.window_glass.append(glass)
			b.box(w + 0.12, 0.08, thick + 0.1, Pal.TIMBER, cx, float(o.top) - 0.04, 0)
			b.box(w + 0.16, 0.08, thick + 0.16, Pal.STONE_LIGHT, cx, float(o.bottom) - 0.06, 0)
			b.box(0.05, hgt, 0.07, Pal.TIMBER, cx, float(o.bottom), 0)
			b.box(w, 0.045, 0.07, Pal.TIMBER, cx, cy - 0.02, 0)
			for s in [-1.0, 1.0]:  # open shutters on the inner face
				b.box(0.4, hgt, 0.04, Pal.OAK, cx + s * (w / 2 + 0.24), float(o.bottom), inside * (thick / 2 + 0.05), 0.0,
					Vector3(0, s * inside * 0.35, 0))
		else:  # door: lintel beam and an open plank door
			b.box(w + 0.2, 0.2, thick + 0.1, Pal.TIMBER, cx, float(o.top), 0)
			b.push(Vector3(cx - w / 2 + 0.04, 0, inside * (thick / 2 + 0.05)), -inside * (PI / 2 - 0.4))
			b.box(w - 0.08, float(o.top) - 0.1, 0.07, Pal.OAK, (w - 0.08) / 2, 0, 0)
			for y in [0.35, 1.5]:
				b.box(w - 0.12, 0.09, 0.09, Pal.IRON, (w - 0.08) / 2, y, 0)
			b.box(0.06, 0.06, 0.12, Pal.IRON, w - 0.2, 1.0, 0)
			b.pop()
	b.pop()


# ---- fence + fireflies -------------------------------------------------------------------------------------------
func _fence(b: Builder) -> void:
	var yard := {"x0": -7.9, "x1": 7.9, "z0": -6.5, "z1": 6.2}
	var posts: Array = []
	var side := func(xa: float, za: float, xb: float, zb: float) -> void:
		var L := sqrt((xb - xa) * (xb - xa) + (zb - za) * (zb - za))
		var cnt := roundi(L / 0.7)
		for i in cnt + 1:
			posts.append(Vector2(xa + (xb - xa) * i / cnt, za + (zb - za) * i / cnt))
	side.call(yard.x0, yard.z0, yard.x1, yard.z0); side.call(yard.x1, yard.z0, yard.x1, yard.z1)
	side.call(yard.x1, yard.z1, yard.x0, yard.z1); side.call(yard.x0, yard.z1, yard.x0, yard.z0)
	for p in posts:
		if p.y > yard.z1 - 0.1 and p.x > -7.5 and p.x < -6.4:
			continue  # gate gap where the path leaves
		b.box(0.1, 0.62, 0.1, Pal.OAK_DARK, p.x, 0, p.y)
		b.cyl(0.0, 0.075, 0.14, Pal.OAK_DARK, p.x, 0.69 - 0.07, p.y, 5)
	var rail := func(xa: float, za: float, xb: float, zb: float, y: float) -> void:
		var L := sqrt((xb - xa) * (xb - xa) + (zb - za) * (zb - za))
		b.box(L, 0.06, 0.05, Pal.OAK, (xa + xb) / 2, y - 0.03, (za + zb) / 2, 0.0, Vector3(0, -atan2(zb - za, xb - xa), 0))
	for y in [0.22, 0.45]:
		rail.call(yard.x0, yard.z0, yard.x1, yard.z0, y); rail.call(yard.x1, yard.z0, yard.x1, yard.z1, y)
		rail.call(-6.3, yard.z1, yard.x1, yard.z1, y); rail.call(yard.x0, yard.z1, yard.x0, yard.z0, y)
		rail.call(yard.x0, yard.z1, -7.5, yard.z1, y)


func _fireflies(x0: float, x1: float, z0: float, z1: float) -> void:
	_fly_root = Node3D.new()
	add_child(_fly_root)
	var g := Lcg.new(99)
	var core_mesh := SphereMesh.new(); core_mesh.radius = 0.035; core_mesh.height = 0.07; core_mesh.radial_segments = 6; core_mesh.rings = 3
	var halo_mesh := SphereMesh.new(); halo_mesh.radius = 0.13; halo_mesh.height = 0.26; halo_mesh.radial_segments = 8; halo_mesh.rings = 4
	while _flies.size() < 30:
		var x := (g.next() - 0.5) * 15.0
		var z := (g.next() - 0.5) * 12.0
		if x > x0 - 0.5 and x < x1 + 0.5 and z > z0 - 0.5 and z < z1 + 0.5:
			continue
		var node := Node3D.new()
		var core := MeshInstance3D.new(); core.mesh = core_mesh
		var cm := StandardMaterial3D.new()
		cm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED; cm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		cm.albedo_color = Color8(0xe6, 0xff, 0xa0)
		core.material_override = cm; core.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		var halo := MeshInstance3D.new(); halo.mesh = halo_mesh
		var hm := StandardMaterial3D.new()
		hm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED; hm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		hm.albedo_color = Color8(0xb8, 0xff, 0x70)
		halo.material_override = hm; halo.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		node.add_child(core); node.add_child(halo)
		_fly_root.add_child(node)
		_flies.append({"node": node, "cm": cm, "hm": hm, "x": x, "y": 0.4 + g.next() * 1.3, "z": z, "ph": g.next() * 20.0})


func update_fireflies(t: float, night: float) -> void:
	_fly_root.visible = night > 0.3
	if not _fly_root.visible:
		return
	for f in _flies:
		f.node.position = Vector3(f.x + sin(t * 0.4 + f.ph) * 0.9, f.y + sin(t * 0.9 + f.ph) * 0.25, f.z + cos(t * 0.35 + f.ph * 1.3) * 0.9)
		var br := 0.25 + 0.75 * maxf(0.0, sin(t * 1.7 + f.ph * 3.0))
		f.cm.albedo_color.a = br * night
		f.hm.albedo_color.a = 0.22 * br * night


## Furniture index hit by a world-space ray, or -1. Oriented footprint boxes, nearest first.
func pick_item(origin: Vector3, dir: Vector3, skip: Array = ["rug"]) -> int:
	var best := -1
	var best_t := INF
	for it in items:
		if skip.has(it.def):
			continue
		var inv := Transform3D(Basis(Vector3.UP, it.rot), Vector3(it.x, it.y, it.z)).affine_inverse()
		var o: Vector3 = inv * origin
		var d: Vector3 = inv.basis * dir
		var lo := Vector3(-it.hw, 0.0, -it.hd)
		var hi := Vector3(it.hw, it.h, it.hd)
		var t0 := -INF
		var t1 := INF
		var hit := true
		for ax in 3:
			if absf(d[ax]) < 1e-8:
				if o[ax] < lo[ax] or o[ax] > hi[ax]:
					hit = false
					break
			else:
				var ta := (lo[ax] - o[ax]) / d[ax]
				var tb := (hi[ax] - o[ax]) / d[ax]
				t0 = maxf(t0, minf(ta, tb))
				t1 = minf(t1, maxf(ta, tb))
		if hit and t0 <= t1 and t1 > 0.0 and t0 < best_t:
			best_t = t0
			best = it.index
	return best
