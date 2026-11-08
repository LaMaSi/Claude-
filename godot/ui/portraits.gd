class_name Portraits
extends Node
## Renders each character's face (or full body) once into an ImageTexture for the dock and the Bonds tab.
## Auto-framed from the head, like src/render/portraits.js.

var textures: Dictionary = {}   # id -> ImageTexture


func _bounds(n: Node, acc: Array) -> void:
	if n is MeshInstance3D and (n as MeshInstance3D).mesh != null:
		var mi := n as MeshInstance3D
		var ab := mi.get_aabb()
		for i in 8:
			var corner := ab.position + ab.size * Vector3(i & 1, (i >> 1) & 1, (i >> 2) & 1)
			var wp := mi.global_transform * corner
			acc[0] = wp if acc[0] == null else Vector3(minf(acc[0].x, wp.x), minf(acc[0].y, wp.y), minf(acc[0].z, wp.z))
			acc[1] = wp if acc[1] == null else Vector3(maxf(acc[1].x, wp.x), maxf(acc[1].y, wp.y), maxf(acc[1].z, wp.z))
	for ch in n.get_children():
		_bounds(ch, acc)


## Renders all characters; awaits until done.
func render_all(chars: Array, size: int = 192) -> void:
	var jobs: Array = []
	for c in chars:
		var vp := SubViewport.new()
		vp.size = Vector2i(size, size)
		vp.transparent_bg = true
		vp.own_world_3d = true
		vp.msaa_3d = Viewport.MSAA_4X
		vp.render_target_update_mode = SubViewport.UPDATE_ONCE
		add_child(vp)
		var env := Environment.new()
		env.background_mode = Environment.BG_CLEAR_COLOR
		env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
		env.ambient_light_color = Color(1.0, 0.957, 0.878)
		env.ambient_light_energy = 1.0
		env.tonemap_mode = Environment.TONE_MAPPER_ACES
		var we := WorldEnvironment.new()
		we.environment = env
		vp.add_child(we)
		var sun := DirectionalLight3D.new()
		sun.light_energy = 1.7
		vp.add_child(sun)
		sun.look_at_from_position(Vector3(-2, 3, 4), Vector3.ZERO, Vector3.UP)
		var p := People.build_person(c)
		p.root.rotation.y = 0.35
		vp.add_child(p.root)
		var cam := Camera3D.new()
		cam.projection = Camera3D.PROJECTION_ORTHOGONAL
		cam.near = 0.1
		cam.far = 30.0
		vp.add_child(cam)
		var head: Node3D = p.parts.head
		var head_pos := head.global_position
		var rad := 0.2 * float(c.get("headScale", 1.0)) * float(c.get("scale", 1.0)) * maxf(float(c.look.get("headW", 1.0)), 1.0)
		var acc: Array = [null, null]
		_bounds(head, acc)
		var top: float = (acc[1].y - head_pos.y) if acc[1] != null else rad
		var hh := minf(maxf(rad * 1.75, (top + rad * 0.9) * 0.5 + rad * 0.6), rad * 2.7)
		var cy := head_pos.y - rad * 0.12 + maxf(0.0, hh - rad * 1.75) * 0.85
		var cx := head_pos.x
		cam.size = hh * 2.0
		cam.position = Vector3(cx, cy, 6.0)
		cam.look_at(Vector3(cx, cy, 0.0), Vector3.UP)
		jobs.append({"id": c.id, "vp": vp})
	await RenderingServer.frame_post_draw
	await RenderingServer.frame_post_draw
	for j in jobs:
		var img := (j.vp as SubViewport).get_texture().get_image()
		if img != null and not img.is_empty():
			img.generate_mipmaps()
			textures[j.id] = ImageTexture.create_from_image(img)
		(j.vp as SubViewport).queue_free()
