extends Node3D
## Little Lives (Godot port): builds the world, simulation, camera and UI, and runs the main loop.
## Dev flags (after `--`): --shot=<png> --hour=21.5 --frames=20 --speed=1 --seed=1 --focus=<id> --zoom=9 --yaw=0.8
##                         --open=<tab> (open the character panel on that tab)

const BASE := Vector3(0, 1.0, 0.8)
const CAM_OFFSET := Vector3(20, 17.5, 19.2)
const UI_TOP := 52.0      # CSS-px of the web build: space reserved for the clock and the (closed) dock
const UI_BOTTOM := 112.0
const SETTINGS := "user://settings.cfg"

var sim: Sim
var world: World
var daynight: DayNight
var view: CharactersView
var baker: FaceBaker
var camera: Camera3D
var rig: CamRig
var hud: Hud
var pixel: PixelLook
var portraits: Portraits
var marker: MeshInstance3D
var marker_t := 1.0
var hour := 21.5
var auto_time := false
var speed := 1.0
var _args := {}
var _frame := 0
var _shift := 0.0
var _ready_ui := false
var _ema_ms := 16.0
var _slow_for := 0.0
var _quality := 0
var _detail := 1          # 0 low, 1 medium (pixel budget), 2 high (native)
var _show_perf := false
var _perf_acc := 0.0
var _perf_us := {"sim": 0, "daynight": 0, "view": 0, "hud_update": 0}


func _ready() -> void:
	GameData.ensure()
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		_args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	hour = float(_args.get("hour", 21.5))
	speed = float(_args.get("speed", 1))
	if _args.has("seed"):
		seed(int(_args.seed))

	sim = Sim.new(GameData.house, GameData.family, Layout.load_items())
	daynight = DayNight.new()
	add_child(daynight)
	world = World.new()
	add_child(world)
	world.build(GameData.house, sim.items)

	baker = FaceBaker.new()
	add_child(baker)
	Face.baker = baker
	view = CharactersView.new()
	add_child(view)
	view.setup(sim)
	# pre-bake the other painted expressions so mood changes never flash a blank face
	for c in sim.chars:
		var look := Face.merged_look(c.look)
		for ex in ["blink", "happy", "content", "sad", "tired", "sleep"]:
			Face.head_material(look, ex)
	sim.select("sam")

	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.keep_aspect = Camera3D.KEEP_HEIGHT
	camera.near = 4.0     # tight depth range = more precision (the camera sits ~32 units from the scene)
	camera.far = 140.0
	add_child(camera)
	rig = CamRig.new()
	add_child(rig)
	rig.setup(camera, BASE, CAM_OFFSET)
	rig.tapped.connect(_on_tap)
	get_viewport().size_changed.connect(_fit_camera)
	_fit_camera()

	marker = MeshInstance3D.new()
	marker.mesh = CharactersView._ring_mesh(0.2, 0.3, 28)
	var mm := StandardMaterial3D.new()
	mm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mm.albedo_color = Color(1, 1, 1, 0)
	mm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mm.cull_mode = BaseMaterial3D.CULL_DISABLED
	mm.no_depth_test = true
	marker.material_override = mm
	marker.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(marker)

	# post effect + UI come once faces are painted and portraits rendered
	pixel = PixelLook.new()
	var pl := CanvasLayer.new()
	pl.layer = 5
	add_child(pl)
	pl.add_child(pixel)
	portraits = Portraits.new()
	add_child(portraits)
	_boot_ui()


func _boot_ui() -> void:
	while baker.pending() > 0:
		await get_tree().process_frame
	await get_tree().process_frame
	await portraits.render_all(sim.chars)
	hud = Hud.new()
	add_child(hud)
	hud.setup(sim, portraits.textures)
	rig.ui_blocks = hud.blocks
	hud.portrait_pressed.connect(func(id: String): _select(id, true))
	hud.hour_changed.connect(func(h: float): hour = h)
	hud.auto_toggled.connect(func(on: bool): auto_time = on)
	hud.pixel_changed.connect(_set_pixel)
	hud.perf_changed.connect(func(on: bool): _show_perf = on; _save_view("perf", on))
	hud.detail_changed.connect(func(l: int): _apply_detail(l); _save_view("detail", l))
	var cfg := ConfigFile.new()
	if cfg.load(SETTINGS) == OK:
		_show_perf = cfg.get_value("view", "perf", false)
		hud.set_perf_ui(_show_perf)
		_detail = int(cfg.get_value("view", "detail", 1))
		_set_pixel(cfg.get_value("view", "pixel", false), float(cfg.get_value("view", "pixel_cell", 3)))
		hud.set_pixel_ui(cfg.get_value("view", "pixel", false), int(cfg.get_value("view", "pixel_cell", 3)))
	if _args.has("open"):
		hud.set_open(true)
		hud.set_tab(_args.open)
	hud.set_hour_silently(hour)
	hud.set_detail_ui(_detail)
	_apply_detail(_detail)
	_ready_ui = true
	_fit_camera()


func _save_view(key: String, value: Variant) -> void:
	var cfg := ConfigFile.new()
	cfg.load(SETTINGS)
	cfg.set_value("view", key, value)
	cfg.save(SETTINGS)


## How many 3D pixels we draw. The web build capped devicePixelRatio at 2 (~1.3M px on a phone); drawing every
## native pixel of a tall phone (~2.6M) doubles the fill cost. Medium targets ~1.5M px; UI is always native-sharp.
func _apply_detail(level: int) -> void:
	_detail = level
	var win := Vector2(DisplayServer.window_get_size())
	var vp := get_viewport()
	vp.scaling_3d_mode = Viewport.SCALING_3D_MODE_BILINEAR
	var s := 1.0
	match level:
		0: s = clampf(sqrt(0.9e6 / maxf(win.x * win.y, 1.0)), 0.5, 1.0)
		1: s = clampf(sqrt(1.5e6 / maxf(win.x * win.y, 1.0)), 0.5, 1.0)
	if _args.has("scale"):
		s = float(_args.scale)
	vp.scaling_3d_scale = s
	daynight.sun.shadow_blur = 0.0 if level == 0 else 1.6
	_quality = 0   # re-arm the adaptive fallback relative to the chosen level


func _set_pixel(on: bool, cell: float) -> void:
	pixel.visible = on
	pixel.set_cell(cell)
	var cfg := ConfigFile.new()
	cfg.load(SETTINGS)
	cfg.set_value("view", "pixel", on)
	cfg.set_value("view", "pixel_cell", int(cell))
	cfg.save(SETTINGS)


func _select(id: String, focus: bool = true) -> void:
	sim.select(id)
	if focus:
		var c: Dictionary = sim.get_char(id)
		rig.focus(c.x, c.z)


func _flash(x: float, z: float, color: Color) -> void:
	marker.position = Vector3(x, 0.05, z)
	(marker.material_override as StandardMaterial3D).albedo_color = color
	marker_t = 0.0


# ---- picking (port of onTap in src/main.js) ----------------------------------------------------------------------
func _on_tap(p: Vector2) -> void:
	# 1) characters: generous screen-space radius, good for fingers
	var hit: Variant = null
	var best := 44.0 * Hud.S
	for c in sim.chars:
		var sp := camera.unproject_position(Vector3(c.x, c.y + 0.75 * c.scale, c.z))
		var d := sp.distance_to(p)
		if d < best:
			best = d
			hit = c
	if hit != null:
		_select(hit.id, false)
		return
	var sel: Variant = sim.get_char(sim.selected_id)
	if sel == null:
		return
	# 2) furniture
	var idx := world.pick_item(camera.project_ray_origin(p), camera.project_ray_normal(p))
	if idx >= 0:
		var it: Dictionary = sim.get_item(idx)
		_flash(it.x, it.z, Color("ffd36b") if sim.command_use(sel, idx) else Color("ff7b7b"))   # red: busy / unusable
		return
	# 3) ground
	var g: Variant = rig.ground(p)
	if g != null:
		var t: Variant = sim.nav.nearest_walkable(g.x, g.z, 6)
		if t != null and sim.command_move(sel, t.x, t.y):
			_flash(t.x, t.y, Color.WHITE)


# ---- layout ------------------------------------------------------------------------------------------------------
func _fit_camera() -> void:
	var vs := get_viewport().get_visible_rect().size
	var w := vs.x
	var h := vs.y
	var h_eff := maxf(200.0 * Hud.S, h - (UI_TOP + UI_BOTTOM) * Hud.S)
	var need_w := 17.0 if w < h else 22.0
	var need_h := 15.5
	var size_eff := maxf(need_h, need_w * h_eff / w)    # world height that must fit in the free band (dock closed)
	var size := size_eff * h / h_eff
	if rig != null:
		rig.refit(size)
	_shift = (UI_BOTTOM - UI_TOP) * Hud.S / 2.0
	_apply_shift(size)


func _apply_shift(size: float) -> void:
	# lift the scene above the dock (the web build uses camera.setViewOffset)
	var h := get_viewport().get_visible_rect().size.y
	camera.v_offset = -_shift / h * size / maxf(rig.zoom if rig != null else 1.0, 0.001)


func _process(delta: float) -> void:
	_frame += 1
	var t := Time.get_ticks_msec() / 1000.0
	if _args.has("focus"):   # dev: close-up on a character
		var fc: Variant = sim.get_char(_args.focus)
		if fc != null:
			var tgt := Vector3(fc.x, 0.8 * fc.scale, fc.z)
			camera.position = tgt + CAM_OFFSET.normalized() * 30.0
			camera.look_at(tgt, Vector3.UP)
			camera.size = 17.0 / float(_args.get("zoom", 9))
			camera.v_offset = 0.0
	elif _ready_ui:
		rig.update(delta)
		# detail by zoom (hysteresis so it never flickers): full detail only when a character is large on screen
		if view.lod == 1 and rig.zoom > 2.3:
			view.set_lod(0)
		elif view.lod == 0 and rig.zoom < 1.9:
			view.set_lod(1)
		var dock_h := hud.dock_height() if hud != null else 0.0
		var target_shift := (maxf(UI_BOTTOM * Hud.S, dock_h + 14.0 * Hud.S) - UI_TOP * Hud.S) / 2.0
		_shift += (target_shift - _shift) * (1.0 - exp(-delta * 9.0))
		_apply_shift(rig.base_size)
	if auto_time:
		var nh := fmod(hour + delta * 0.5, 24.0)
		if nh < hour:
			sim.advance_day()
		hour = nh
		if hud != null:
			hud.set_hour_silently(hour)
	_adapt_quality(delta)
	sim.hour = hour
	var t0 := Time.get_ticks_usec()
	sim.update(delta * speed)
	var t1 := Time.get_ticks_usec()
	daynight.update(hour, world, t)
	var t2 := Time.get_ticks_usec()
	view.update(delta, t, sim.selected_id)
	var t3 := Time.get_ticks_usec()
	_perf_us["sim"] += t1 - t0
	_perf_us["daynight"] += t2 - t1
	_perf_us["view"] += t3 - t2
	if _args.has("yaw"):
		for id in view.views:
			view.views[id].root.rotation.y = float(_args.yaw)
	if marker_t < 1.0:
		marker_t += delta / 0.7
		var mm := marker.material_override as StandardMaterial3D
		mm.albedo_color.a = (1.0 - marker_t) * 0.9
		marker.scale = Vector3.ONE * (1.0 + marker_t * 1.2)
	if _show_perf and hud != null:
		_perf_acc += delta
		if _perf_acc > 0.5:
			_perf_acc = 0.0
			hud.set_perf_text("%d fps  %.1f ms\n%s  3D x%.2f\ndraw %d  tris %dk" % [Engine.get_frames_per_second(), delta * 1000.0,
				RenderingServer.get_current_rendering_method(), get_viewport().scaling_3d_scale,
				Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME), Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME) / 1000.0])
	if hud != null:
		var t4 := Time.get_ticks_usec()
		hud.update(delta, hour)
		_perf_us["hud_update"] += Time.get_ticks_usec() - t4
	if _args.has("perf") and _frame == 100:
		print("TRIS world=%d characters=%d" % [_tris(world), _tris(view)])
		for k in _perf_us:
			_perf_us[k] = 0
	if _args.has("perf") and _frame == 400:
		var n := 300.0
		print("CPU us/frame: sim=%.0f daynight=%.0f chars_view=%.0f hud_update=%.0f" % [_perf_us.sim / n, _perf_us.daynight / n, _perf_us.view / n, _perf_us.hud_update / n])
	if _args.has("perf") and _frame % 60 == 0 and _frame > 60:
		print("PERF frame %d: draw_calls=%d prims=%d objects=%d nodes=%d script_ms=%.2f process_ms=%.2f vram_mb=%.0f" % [_frame,
			Performance.get_monitor(Performance.RENDER_TOTAL_DRAW_CALLS_IN_FRAME), Performance.get_monitor(Performance.RENDER_TOTAL_PRIMITIVES_IN_FRAME),
			Performance.get_monitor(Performance.RENDER_TOTAL_OBJECTS_IN_FRAME), Performance.get_monitor(Performance.OBJECT_NODE_COUNT),
			Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0, Performance.get_monitor(Performance.TIME_PROCESS) * 1000.0,
			Performance.get_monitor(Performance.RENDER_VIDEO_MEM_USED) / 1048576.0])
	if _args.has("touchtest") and _ready_ui and _frame == 40:
		_touch_at(hud.clock_btn.get_global_rect().get_center())
	if _args.has("touchtest") and _ready_ui and _frame == 50:
		print("TOUCHTEST clock popup visible=%s (expect true)" % hud.time_pop.visible)
		var before: String = sim.selected_id
		var pr: Control = hud.port_btns["maya"].avatar
		_touch_at(pr.get_global_rect().get_center())
	if _args.has("touchtest") and _ready_ui and _frame == 60:
		print("TOUCHTEST portrait tap: selected=%s panel_open=%s (expect maya, true)" % [sim.selected_id, hud.open])
		# a tap on empty world must still reach the game: tap Robin
		var rb: Dictionary = sim.get_char("robin")
		_touch_at(camera.unproject_position(Vector3(rb.x, 0.75 * rb.scale, rb.z)))
	if _args.has("touchtest") and _ready_ui and _frame == 70:
		print("TOUCHTEST world tap: selected=%s (expect robin)" % sim.selected_id)
	if _args.has("taptest") and _ready_ui and _frame == 40:
		var sam: Dictionary = sim.get_char("sam")
		var log := []
		# furniture: tap the harp -> Sam should walk there and play
		var harp: Dictionary = world.items.filter(func(i): return i.def == "harp")[0]
		_on_tap(camera.unproject_position(Vector3(harp.x, 0.6, harp.z)))
		log.append("tap harp -> mode=%s pending=%s" % [sam.mode, sam.pending != null])
		# character: tap Maya
		var maya: Dictionary = sim.get_char("maya")
		_on_tap(camera.unproject_position(Vector3(maya.x, 0.75 * maya.scale, maya.z)))
		log.append("tap Maya -> selected=%s" % sim.selected_id)
		# ground: Maya selected now; tap empty garden floor
		var g := Vector3(-6.0, 0, -4.5)
		_on_tap(camera.unproject_position(g))
		log.append("tap ground -> Maya mode=%s" % maya.mode)
		print("TAPTEST ", " | ".join(log))
	if _args.has("shot") and _frame >= int(_args.get("frames", 12)) and baker.pending() == 0 and _ready_ui and _frame > 30:
		var img := get_viewport().get_texture().get_image()
		img.save_png(_args.shot)
		print("saved ", _args.shot, " ", img.get_size())
		if hud != null and _args.has("debug_ui"):
			print("viewport ", get_viewport().get_visible_rect(), " window ", DisplayServer.window_get_size())
			print("root ", hud.root.position, hud.root.size, " dock_box ", hud.dock_box.position, hud.dock_box.size, " anchors ", hud.dock_box.anchor_top, hud.dock_box.anchor_bottom, " offsets ", hud.dock_box.offset_top, hud.dock_box.offset_bottom)
			print("panel ", hud.panel.position, hud.panel.size, " pbody ", hud.pbody.size, " min ", hud.dock_box.get_combined_minimum_size())
		get_tree().quit()


func _tris(n: Node) -> int:
	var total := 0
	if n is Node3D and not (n as Node3D).visible:
		return 0
	if n is MeshInstance3D and (n as MeshInstance3D).mesh != null:
		var m := (n as MeshInstance3D).mesh
		if m is ArrayMesh:
			for i in m.get_surface_count():
				var il := (m as ArrayMesh).surface_get_array_index_len(i)
				total += (il if il > 0 else (m as ArrayMesh).surface_get_array_len(i)) / 3
		else:
			total += m.get_faces().size() / 3
	for c in n.get_children():
		total += _tris(c)
	return total


## Same idea as the web build: if frames stay slow for a few seconds, trade quality for speed (never the other way).
## level 1: render at 80% and drop shadow softening; level 2: 66%, small shadow map.
func _adapt_quality(delta: float) -> void:
	if _frame < 120 or _args.has("shot"):
		return
	_ema_ms += (minf(delta, 0.1) * 1000.0 - _ema_ms) * 0.05
	_slow_for = _slow_for + delta if _ema_ms > 26.0 else 0.0
	if _slow_for > 3.0 and _quality < 2:
		_quality += 1
		_slow_for = 0.0
		var vp := get_viewport()
		vp.scaling_3d_mode = Viewport.SCALING_3D_MODE_BILINEAR
		daynight.sun.shadow_blur = 0.0
		if _quality == 1:
			vp.scaling_3d_scale = maxf(0.5, vp.scaling_3d_scale * 0.85)
		else:
			vp.scaling_3d_scale = maxf(0.5, vp.scaling_3d_scale * 0.8)
			RenderingServer.directional_shadow_atlas_set_size(1024, true)
		print("quality -> level ", _quality)


## Dev: push a real touch press + release through the input system (exercises GUI, emulation and the camera rig).
func _touch_at(p: Vector2) -> void:
	var down := InputEventScreenTouch.new()
	down.index = 0
	down.position = p
	down.pressed = true
	Input.parse_input_event(down)
	var up := InputEventScreenTouch.new()
	up.index = 0
	up.position = p
	up.pressed = false
	get_tree().create_timer(0.05).timeout.connect(func(): Input.parse_input_event(up))
