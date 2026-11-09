class_name CharactersView
extends Node3D
## Turns simulation state into rig poses. All animation is procedural. Ported from src/render/charactersView.js.

const KEYS := ["legL", "legR", "armL", "armR", "armZ", "lie", "bob", "headX", "roll", "lean", "sit"]

var sim: Sim
var views: Dictionary = {}
var ring: MeshInstance3D
var lod := 0


func set_lod(level: int) -> void:
	if level == lod:
		return
	lod = level
	for id in views:
		People.set_lod(views[id], level)


func setup(p_sim: Sim) -> void:
	sim = p_sim
	for c in sim.chars:
		var p := People.build_person(c)
		p.cur = {}
		for k in KEYS:
			p.cur[k] = 0.0
		p.cur.armZ = -0.12
		p.phase = randf() * 6.0
		p.blink_at = 1.0 + randf() * 3.0
		p.expr = "neutral"
		add_child(p.root)
		views[c.id] = p
	ring = MeshInstance3D.new()
	ring.mesh = _ring_mesh(0.42, 0.54, 40)
	var rm := StandardMaterial3D.new()
	rm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	rm.albedo_color = Color(1.0, 0.827, 0.42, 0.95)
	rm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	rm.cull_mode = BaseMaterial3D.CULL_DISABLED
	ring.material_override = rm
	ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(ring)


static func _ring_mesh(r0: float, r1: float, seg: int) -> ArrayMesh:
	var pos := PackedVector3Array()
	var nrm := PackedVector3Array()
	var idx := PackedInt32Array()
	for i in seg + 1:
		var a := TAU * i / seg
		pos.append(Vector3(r0 * cos(a), 0, r0 * sin(a)))
		pos.append(Vector3(r1 * cos(a), 0, r1 * sin(a)))
		nrm.append(Vector3.UP)
		nrm.append(Vector3.UP)
	for i in seg:
		var a := i * 2
		idx.append_array([a, a + 1, a + 2, a + 1, a + 3, a + 2])
	var arrays := []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = pos
	arrays[Mesh.ARRAY_NORMAL] = nrm
	arrays[Mesh.ARRAY_INDEX] = idx
	var m := ArrayMesh.new()
	m.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return m


## Which painted expression a character wears right now (a sim-set emote wins; otherwise mood, needs and activity).
func expr_for(c: Dictionary) -> String:
	if c.emote != "":
		return c.emote
	if c.pose.kind == "sleep":
		return "sleep"
	var act: String = c.activity
	if act.begins_with("Bathing") or act.begins_with("Washing"):
		return "content"
	if "harp" in act or "Playing" in act:
		return "happy"
	var low := 1.0
	for v in c.needs.values():
		low = minf(low, v)
	if low < 0.12: return "sad"
	if c.mood > 0.82: return "happy"
	if c.mood < 0.3: return "sad"
	if c.mood > 0.64: return "content"
	if c.mood < 0.46: return "tired"
	return "neutral"


func _targets(c: Dictionary, v: Dictionary, t: float, dt: float) -> Dictionary:
	var T := {"legL": 0.0, "legR": 0.0, "armL": 0.0, "armR": 0.0, "armZ": -0.12, "lie": 0.0, "bob": 0.0, "headX": 0.0, "roll": 0.0, "lean": 0.0, "sit": 0.0}
	var breathe := sin(t * 2.0 + v.phase)
	if c.mode == "walk":
		v.phase += dt * c.speed * 5.2
		var s := sin(v.phase)
		T.legL = s * 0.75; T.legR = -s * 0.75; T.armL = -s * 0.6; T.armR = s * 0.6
		T.bob = absf(cos(v.phase)) * 0.05; T.roll = sin(v.phase) * 0.07; T.lean = 0.07
	else:
		T.bob = breathe * 0.008; T.armL = breathe * 0.02; T.armR = -breathe * 0.02
		var kind: String = c.pose.kind
		if kind == "sit":
			T.legL = -PI / 2.0 + 0.05; T.legR = T.legL; T.armL = -0.75; T.armR = -0.75; T.sit = 1.0; T.lean = 0.06
			if c.pose.anim == "rest":
				T.armL = -0.95; T.armR = -0.95
		elif kind == "sleep":
			T.lie = 1.0; T.bob = breathe * 0.012; T.armL = 0.05; T.armR = 0.05; T.armZ = 0.12
		else:
			var a: String = c.pose.anim
			var busy := 1.0 if c.mode == "use" else 0.0
			if a == "forward":
				T.armL = -1.15 + sin(t * 7.0) * 0.2 * busy
				T.armR = -1.15 + cos(t * 6.0) * 0.2 * busy
				T.headX = 0.15
			if a == "raise":
				T.armL = -2.5 + sin(t * 6.0) * 0.35 * busy
				T.armR = -2.5 + sin(t * 6.0 + 2.0) * 0.35 * busy
				T.armZ = 0.35
				T.bob = sin(t * 9.0) * 0.01
	return T


func update(dt: float, t: float, selected_id: String) -> void:
	var k := 1.0 - exp(-dt * 14.0)
	for c in sim.chars:
		var v: Dictionary = views[c.id]
		var T := _targets(c, v, t, dt)
		for key in KEYS:
			v.cur[key] += (T[key] - v.cur[key]) * k
		var parts: Dictionary = v.parts
		var cur: Dictionary = v.cur
		parts.legL.rotation.x = cur.legL; parts.legR.rotation.x = cur.legR
		parts.armL.rotation.x = cur.armL; parts.armR.rotation.x = cur.armR
		parts.armL.rotation.z = cur.armZ; parts.armR.rotation.z = -cur.armZ
		# no legs: sitting raises the hem onto the seat; walking waddles and leans; idle breathes and glances around
		parts.body.position.y = cur.bob + cur.sit * 0.38
		parts.body.rotation.z = cur.roll
		parts.body.rotation.x = cur.lean
		parts.body.scale.y = 1.0 + sin(t * 2.0 + v.phase) * 0.012 - cur.sit * 0.04
		parts.head.rotation.x = cur.headX
		parts.head.rotation.y = 0.0 if (c.mode == "walk" or c.pose.kind == "sleep") else sin(t * 0.45 + v.phase * 2.0) * 0.28
		if parts.head.has_meta("skull"):
			v.blink_at -= dt
			var ex := expr_for(c)
			if v.blink_at < 0.0:
				if v.blink_at > -0.13:
					if ex == "neutral" or ex == "content" or ex == "tired":
						ex = "blink"
				else:
					v.blink_at = 2.0 + randf() * 4.0
			if ex != v.expr:
				v.expr = ex
				var mat := Face.head_material(parts.head.get_meta("look"), ex)
				for sk in parts.head.get_meta("skulls"):
					(sk as MeshInstance3D).material_override = mat
		v.pivot.rotation.x = -PI / 2.0 * cur.lie
		v.root.position = Vector3(c.x, c.y, c.z)
		v.root.rotation.y = c.yaw
	var sel: Variant = sim.get_char(selected_id)
	ring.visible = sel != null
	if sel != null:
		var s := 1.0 + sin(t * 4.0) * 0.06
		var r: float = 0.55 * (0.55 + 0.45 * sel.scale)
		ring.position = Vector3(sel.x, 0.03, sel.z)
		ring.scale = Vector3.ONE * (r * s / 0.5)
