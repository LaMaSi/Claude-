extends Node3D
## Little Lives (Godot port). Builds the world, simulation, camera and UI.
## Dev flags (after `--`): --shot=<png> --hour=21.5 --frames=20 --speed=1

const BASE := Vector3(0, 1.0, 0.8)
const CAM_OFFSET := Vector3(20, 17.5, 19.2)

var sim: Sim
var world: World
var daynight: DayNight
var camera: Camera3D
var hour := 21.5
var auto_time := false
var _args := {}
var _frame := 0


func _ready() -> void:
	GameData.ensure()
	for a in OS.get_cmdline_user_args():
		var kv := a.trim_prefix("--").split("=", true, 1)
		_args[kv[0]] = kv[1] if kv.size() > 1 else "1"
	hour = float(_args.get("hour", 21.5))
	if _args.has("seed"):
		seed(int(_args.seed))

	sim = Sim.new(GameData.house, GameData.family)
	daynight = DayNight.new()
	add_child(daynight)
	world = World.new()
	add_child(world)
	world.build(GameData.house)

	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.keep_aspect = Camera3D.KEEP_HEIGHT
	camera.near = 0.1
	camera.far = 200.0
	add_child(camera)
	camera.position = BASE + CAM_OFFSET
	camera.look_at(BASE, Vector3.UP)
	get_viewport().size_changed.connect(_fit_camera)
	_fit_camera()


func _fit_camera() -> void:
	var vs := get_viewport().get_visible_rect().size
	var need_w := 17.0 if vs.x < vs.y else 22.0
	var need_h := 15.5
	camera.size = maxf(need_h, need_w * vs.y / vs.x)


func _process(delta: float) -> void:
	_frame += 1
	var t := Time.get_ticks_msec() / 1000.0
	if auto_time:
		hour = fmod(hour + delta * 0.5, 24.0)
	sim.hour = hour
	sim.update(delta * float(_args.get("speed", 1)))
	daynight.update(hour, world, t)
	if _args.has("shot") and _frame == int(_args.get("frames", 12)):
		var img := get_viewport().get_texture().get_image()
		img.save_png(_args.shot)
		print("saved ", _args.shot, " ", img.get_size())
		get_tree().quit()
