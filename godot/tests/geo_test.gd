extends SceneTree
## Winding / normal sanity for Geo: normals must point away from the shape's axis.
func _init() -> void:
	GameData.ensure()
	# lathe: cylinder-ish profile bottom->top
	var m := Geo.lathe([Vector2(0.0, 0.0), Vector2(0.5, 0.0), Vector2(0.5, 1.0), Vector2(0.0, 1.0)], 16)
	var arr := m.surface_get_arrays(0)
	var pos: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
	var nrm: PackedVector3Array = arr[Mesh.ARRAY_NORMAL]
	var idx: PackedInt32Array = arr[Mesh.ARRAY_INDEX]
	var bad_n := 0
	for v in pos.size():
		var p := pos[v]
		if absf(p.x) + absf(p.z) > 0.01 and p.y > 0.01 and p.y < 0.99:  # side wall
			if nrm[v].dot(Vector3(p.x, 0, p.z).normalized()) < 0.9:
				bad_n += 1
	# triangle winding must be clockwise from outside (geometric normal opposite to vertex normal)
	var bad_w := 0
	var i := 0
	while i < idx.size():
		var a := pos[idx[i]]; var b := pos[idx[i + 1]]; var c := pos[idx[i + 2]]
		var gn := (b - a).cross(c - a)
		var cen := (a + b + c) / 3.0
		if gn.length() > 1e-9 and absf(cen.y - 0.5) < 0.45 and Vector2(cen.x, cen.z).length() > 0.4:
			if gn.dot(Vector3(cen.x, 0, cen.z)) > 0.0:  # CW-from-outside => cross points inward
				bad_w += 1
		i += 3
	print("lathe verts ", pos.size(), " bad normals ", bad_n, " wrongly wound side tris ", bad_w)
	var t := Geo.tube([[0, 0, 0], [0, -0.2, 0], [0, -0.4, 0.05]], 0.05, 0.02, 0xaa8844)
	print("tube verts ", (t.surface_get_arrays(0)[Mesh.ARRAY_VERTEX] as PackedVector3Array).size())
	print("tint check: ", String.num_int64(Geo.tint(0xf2c4a0, -0.06), 16), " ", String.num_int64(Geo.mix_hex(0xe6b08a, 0x9a3a3a, 0.62), 16))
	quit(0)
