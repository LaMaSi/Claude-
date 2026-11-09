class_name Prim
extends RefCounted
## Small smooth primitives for characters (ellipsoids, capsules, tori, boxes) built from Godot's PrimitiveMeshes.

static var _mats: Dictionary = {}
static var _sphere_cache: Dictionary = {}


static func smooth_mat(color: int, rough: float = 0.9) -> StandardMaterial3D:
	var key := "%d|%s" % [color, rough]
	if not _mats.has(key):
		var m := StandardMaterial3D.new()
		m.albedo_color = GameData.col(color)
		m.roughness = rough
		_mats[key] = m
	return _mats[key]


static func _sphere(seg: int) -> SphereMesh:
	if not _sphere_cache.has(seg):
		var s := SphereMesh.new()
		s.radius = 0.5
		s.height = 1.0
		s.radial_segments = seg
		s.rings = maxi(4, roundi(seg * 0.7))
		_sphere_cache[seg] = s
	return _sphere_cache[seg]


## Centre-based soft ellipsoid of the given overall size.
static func ell(parent: Node3D, w: float, h: float, d: float, color: int, x: float, y: float, z: float, seg: int = 14) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	m.mesh = _sphere(seg)
	m.material_override = smooth_mat(color)
	m.scale = Vector3(w, h, d)
	m.position = Vector3(x, y, z)
	parent.add_child(m)
	return m


## Sphere of radius r, optionally squashed (sx, sy, sz).
static func ball(parent: Node3D, r: float, color: int, x: float, y: float, z: float, sx: float = 1.0, sy: float = 1.0, sz: float = 1.0, seg: int = 12) -> MeshInstance3D:
	return ell(parent, 2.0 * r * sx, 2.0 * r * sy, 2.0 * r * sz, color, x, y, z, seg)


static func box(parent: Node3D, w: float, h: float, d: float, color: int, x: float, y: float, z: float) -> MeshInstance3D:
	var m := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(w, h, d)
	m.mesh = bm
	m.material_override = smooth_mat(color)
	m.position = Vector3(x, y + h / 2.0, z)
	parent.add_child(m)
	return m


## Torus like THREE.TorusGeometry: lies in the XY plane (axis = +Z). Returns the holder node so rotation/scale behave as in three.js.
static func torus(parent: Node3D, r: float, tube: float, color: int, x: float, y: float, z: float) -> Node3D:
	var holder := Node3D.new()
	holder.position = Vector3(x, y, z)
	var mi := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = r - tube
	tm.outer_radius = r + tube
	tm.rings = 14
	tm.ring_segments = 5
	mi.mesh = tm
	mi.rotation.x = PI / 2.0
	mi.material_override = smooth_mat(color, 0.8)
	holder.add_child(mi)
	parent.add_child(holder)
	return holder
