extends SceneTree
## Finds boxes that share a face plane (same facing, offset < 7 mm) with overlapping area: those z-fight on a GPU.
const EPS := 0.007
const CAM := Vector3(20, 17.5, 19.2)
var seen := {}

func _faces(box: Dictionary) -> Array:
	var t: Transform3D = box.t
	var h: Vector3 = box.half
	var ax := [t.basis.x * h.x, t.basis.y * h.y, t.basis.z * h.z]
	var out: Array = []
	for i in 3:
		for sgn in [-1.0, 1.0]:
			var n: Vector3 = (ax[i] as Vector3).normalized() * sgn
			var c: Vector3 = t.origin + (ax[i] as Vector3) * sgn
			var u: Vector3 = ax[(i + 1) % 3]
			var v: Vector3 = ax[(i + 2) % 3]
			out.append({"n": n, "d": n.dot(c), "c": c, "u": u, "v": v})
	return out

func _rect(f: Dictionary, bx: Vector3, by: Vector3) -> Array[Vector2]:
	var pts: Array[Vector2] = []
	for su in [-1.0, 1.0]:
		for sv in [-1.0, 1.0]:
			var p: Vector3 = f.c + f.u * su + f.v * sv
			pts.append(Vector2(p.dot(bx), p.dot(by)))
	# order as a loop: (-,-), (-,+), (+,+), (+,-)
	var loop: Array[Vector2] = [pts[0], pts[1], pts[3], pts[2]]
	var cen := (loop[0] + loop[1] + loop[2] + loop[3]) / 4.0
	for i in 4:
		loop[i] = cen + (loop[i] - cen) * 0.0 + (loop[i] - cen).normalized() * maxf(0.0, (loop[i] - cen).length() - 0.003)
	return loop

func _check(name: String, boxes: Array) -> int:
	var found := 0
	var faces: Array = []
	for i in boxes.size():
		for f in _faces(boxes[i]):
			faces.append({"i": i, "f": f})
	for a in faces.size():
		for b in range(a + 1, faces.size()):
			var fa: Dictionary = faces[a].f
			var fb: Dictionary = faces[b].f
			if faces[a].i == faces[b].i:
				continue
			if fa.n.dot(fb.n) < 0.999 or fa.n.dot(CAM.normalized()) < 0.05:
				continue   # different facing, or turned away from the camera (cannot be seen)
			if absf(fa.d - fb.d) > EPS:
				continue
			var bx: Vector3 = (fa.n.cross(Vector3.UP) if absf(fa.n.dot(Vector3.UP)) < 0.99 else fa.n.cross(Vector3.RIGHT)).normalized()
			var by: Vector3 = fa.n.cross(bx).normalized()
			var ra := _rect(fa, bx, by)
			var rb := _rect(fb, bx, by)
			if Sim._obb_overlap(ra, rb):
				var key := "%s|%s|%s|%.2f|%.2f|%.2f" % [name, fa.n, snappedf(fa.d, 0.001), snappedf((fa.c as Vector3).x, 0.1), snappedf((fa.c as Vector3).y, 0.1), snappedf((fa.c as Vector3).z, 0.1)]
				if seen.has(key):
					continue
				seen[key] = true
				found += 1
				if found <= 8:
					var ca: Vector3 = fa.c
					var bA: Dictionary = boxes[faces[a].i]
					var bB: Dictionary = boxes[faces[b].i]
					print("   %s: coplanar (dy=%.1f mm) normal %s at (%.2f, %.2f, %.2f)\n        A c=%s size=%s\n        B c=%s size=%s" % [name, absf(fa.d - fb.d) * 1000.0, fa.n, ca.x, ca.y, ca.z, bA.t.origin.snapped(Vector3(0.01, 0.01, 0.01)), (bA.half * 2.0).snapped(Vector3(0.01, 0.01, 0.01)), bB.t.origin.snapped(Vector3(0.01, 0.01, 0.01)), (bB.half * 2.0).snapped(Vector3(0.01, 0.01, 0.01))])
	return found

func _init() -> void:
	GameData.ensure()
	var total := 0
	Builder.capture = true
	# world-level geometry (ground, path, walls, kerbs, scenery, fence)
	Builder.captured = []
	var w := World.new()
	root.add_child(w)
	w.build(GameData.house, [])
	# the world builder committed furniture too (each item has its own Builder): split by checking per def below
	var world_boxes: Array = Builder.captured.duplicate()
	for def in GameData.furniture:
		Builder.captured = []
		var b := Builder.new()
		Models.build_furniture(b, def)
		var n := _check("furniture:" + def, Builder.captured)
		total += n
	# world: only check boxes from the world builder; furniture boxes are local-space, so filter by a marker:
	# the world builder runs first, so its boxes are the first block of `world_boxes`
	Builder.captured = []
	var wb := Builder.new()
	var tmp := Node3D.new()
	wb.dyn_parent = tmp
	w._ground_and_woods(wb, GameData.house)
	w._path(wb)
	var n1 := _check("ground/woods/path", Builder.captured)
	Builder.captured = []
	var wb2 := Builder.new()
	wb2.dyn_parent = tmp
	var rm: Dictionary = GameData.house.room
	w._wall(wb2, "x", rm.z0, rm.x0, rm.x1, rm.wallHeight, GameData.house.openings.filter(func(o): return o.wall == "back"))
	w._wall(wb2, "z", rm.x0, rm.z0, rm.z1, rm.wallHeight, GameData.house.openings.filter(func(o): return o.wall == "left"))
	var Wd: float = float(rm.x1) - float(rm.x0)
	var Dd: float = float(rm.z1) - float(rm.z0)
	wb2.box(Wd + 0.24, 0.3, 0.24, Pal.STONE, (float(rm.x0) + float(rm.x1)) / 2, 0, rm.z1)
	wb2.box(Wd + 0.3, 0.07, 0.3, Pal.STONE_LIGHT, (float(rm.x0) + float(rm.x1)) / 2, 0.3, rm.z1)
	wb2.box(0.24, 0.3, Dd - 0.12, Pal.STONE, rm.x1, 0, (float(rm.z0) + float(rm.z1) - 0.12) / 2)
	wb2.box(0.3, 0.07, Dd - 0.15, Pal.STONE_LIGHT, rm.x1, 0.3, (float(rm.z0) + float(rm.z1) - 0.15) / 2)
	var n2 := _check("walls+kerbs", Builder.captured)
	Builder.captured = []
	var wb3 := Builder.new()
	wb3.dyn_parent = tmp
	w._fence(wb3)
	var n3 := _check("fence", Builder.captured)
	total += n1 + n2 + n3
	print("\nCOPLANAR PAIRS: %d (path %d, walls/kerbs %d, fence %d)" % [total, n1, n2, n3])
	quit(0)
